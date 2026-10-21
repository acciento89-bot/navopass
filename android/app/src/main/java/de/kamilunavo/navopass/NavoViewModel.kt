package de.kamilunavo.navopass

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NavoState(
    val restoring: Boolean = true,
    val loading: Boolean = false,
    val user: NavoUser? = null,
    val assets: List<Asset> = emptyList(),
    val overview: MobileOverview? = null,
    val error: String? = null
)

class NavoViewModel(application: Application) : AndroidViewModel(application) {
    val api = ApiClient(application)
    private val _state = MutableStateFlow(NavoState())
    val state = _state.asStateFlow()

    private val _draftChanges = MutableStateFlow(0)
    val draftChanges = _draftChanges.asStateFlow()
    val serviceDrafts = ServiceDraftCoordinator(application.noBackupFilesDir, { command, completed ->
        viewModelScope.launch {
            val result = runCatching { api.publishDraft(command) }.recoverCatching { error ->
                val reason = when ((error as? NavoApiException)?.code) {
                    "UNAUTHENTICATED" -> ServiceDraftPublishFailure.UNAUTHENTICATED
                    "FORBIDDEN", "ASSET_NOT_FOUND" -> ServiceDraftPublishFailure.FORBIDDEN
                    "DRAFT_KEY_CONTENT_CONFLICT", "DELIVERED_EVENT_REMOVED" -> ServiceDraftPublishFailure.CONFLICT
                    else -> ServiceDraftPublishFailure.UNKNOWN
                }
                throw ServiceDraftPublishException(reason)
            }
            completed(result)
        }
    }).also { it.onChanged = { _draftChanges.value += 1 } }
    private val draftSession = ServiceDraftSessionAdapter(serviceDrafts)
    private fun verifiedDraftOwner(user: NavoUser, attempt: ServiceDraftVerificationAttempt): Boolean =
        runCatching { draftSession.verifiedSession(user.id, attempt) }.getOrElse { true }
        // A valid server identity can still use the old app when its separate journal is unreadable.
    fun verifyDraftSession() = viewModelScope.launch {
        val attempt = draftSession.beginVerification(_state.value.user?.id)
        try { verifiedDraftOwner(api.session(), attempt) }
        catch (_: Exception) { if (serviceDrafts.generation == attempt.generation) draftSession.sessionUnavailable() }
    }
    suspend fun loadAssetForDrafts(id: String): AssetDetails {
        val token = _state.value.user?.id?.let { draftSession.beginAuthorizedOperation(it) }
        val details = api.asset(id)
        if (token != null && details.canEdit && details.asset.archivedAt == null) {
            runCatching { draftSession.loadedPass(token, details.asset.id, details.asset.name, true) }
        }
        return details
    }

    init { restore() }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun restore() = viewModelScope.launch {
        val attempt = draftSession.beginVerification()
        try {
            val user = api.session()
            if (!verifiedDraftOwner(user, attempt)) return@launch
            _state.value = _state.value.copy(user = user)
            refreshAll()
        } catch (_: Exception) {
            if (serviceDrafts.generation != attempt.generation) return@launch
            draftSession.sessionUnavailable()
            _state.value = NavoState(restoring = false)
        } finally {
            _state.value = _state.value.copy(restoring = false)
        }
    }

    fun signIn(email: String, password: String) = viewModelScope.launch {
        val attempt = draftSession.beginVerification()
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            val user = api.signIn(email.trim(), password)
            if (!verifiedDraftOwner(user, attempt)) return@launch
            _state.value = _state.value.copy(user = user)
            refreshAll()
        } catch (error: Exception) {
            _state.value = _state.value.copy(error = error.message)
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }

    fun signOut() {
        draftSession.willLogout() // Synchronous hide/barrier before asynchronous legacy logout.
        viewModelScope.launch { api.signOut(); _state.value = NavoState(restoring = false) }
    }

    fun refreshAll() = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            val assets = api.assets()
            val overview = runCatching { api.overview() }.getOrNull()
            _state.value = _state.value.copy(assets = assets, overview = overview)
        } catch (error: Exception) {
            _state.value = _state.value.copy(error = error.message)
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }

    fun createAsset(draft: AssetDraft, completed: (Asset?) -> Unit) = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        val asset = try { api.createAsset(draft) } catch (error: Exception) {
            _state.value = _state.value.copy(error = error.message)
            null
        }
        if (asset != null) refreshAll() else _state.value = _state.value.copy(loading = false)
        completed(asset)
    }

    fun assetAction(name: String, assetId: String, completed: () -> Unit = {}) = viewModelScope.launch {
        try {
            api.action(name) { put("assetId", assetId) }
            refreshAll()
            completed()
        } catch (error: Exception) {
            _state.value = _state.value.copy(error = error.message)
        }
    }

    fun deleteAccount(password: String, confirmation: String, completed: (Boolean) -> Unit) = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        val token = _state.value.user?.id?.let { draftSession.beginAccountDeletion(it) }
        try {
            api.deleteAccount(password, confirmation)
            draftSession.accountDeletionFinished(token, true)
            _state.value = NavoState(restoring = false)
            completed(true)
        } catch (error: Exception) {
            _state.value = _state.value.copy(loading = false, error = error.message)
            completed(false)
        }
    }
}
