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

    init { restore() }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun restore() = viewModelScope.launch {
        try {
            val user = api.session()
            _state.value = _state.value.copy(user = user)
            refreshAll()
        } catch (_: Exception) {
            _state.value = NavoState(restoring = false)
        } finally {
            _state.value = _state.value.copy(restoring = false)
        }
    }

    fun signIn(email: String, password: String) = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            val user = api.signIn(email.trim(), password)
            _state.value = _state.value.copy(user = user)
            refreshAll()
        } catch (error: Exception) {
            _state.value = _state.value.copy(error = error.message)
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }

    fun signOut() = viewModelScope.launch {
        api.signOut()
        _state.value = NavoState(restoring = false)
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
        try {
            api.deleteAccount(password, confirmation)
            _state.value = NavoState(restoring = false)
            completed(true)
        } catch (error: Exception) {
            _state.value = _state.value.copy(loading = false, error = error.message)
            completed(false)
        }
    }
}
