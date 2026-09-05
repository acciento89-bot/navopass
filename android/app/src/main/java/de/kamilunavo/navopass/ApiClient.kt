package de.kamilunavo.navopass

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class NavoApiException(message: String) : Exception(message)

class ApiClient(context: Context) {
    private val preferences = context.getSharedPreferences("navopass_session", Context.MODE_PRIVATE)
    private var cookie: String?
        get() = preferences.getString("cookie", null)
        set(value) {
            if (value == null) preferences.edit().remove("cookie").apply()
            else preferences.edit().putString("cookie", value).apply()
        }

    suspend fun session(): NavoUser = request("/api/mobile/session").user("user")

    suspend fun signIn(email: String, password: String): NavoUser =
        request("/api/mobile/session", "POST", JSONObject().put("email", email).put("password", password)).user("user")

    suspend fun signOut() {
        runCatching { request("/api/mobile/session", "DELETE") }
        cookie = null
    }

    suspend fun assets(): List<Asset> = request("/api/mobile/assets").array("assets").map { it.asset() }

    suspend fun asset(id: String): AssetDetails {
        val payload = request("/api/mobile/assets/${id.urlPart()}")
        return AssetDetails(
            payload.objectValue("asset").asset(),
            payload.array("events").map { it.event() },
            payload.array("documents").map { it.document() }
        )
    }

    suspend fun publicAsset(publicId: String): AssetDetails {
        val payload = request("/api/mobile/public/${publicId.urlPart()}")
        return AssetDetails(
            payload.objectValue("asset").asset(),
            payload.array("events").map { it.event() },
            payload.array("documents").map { it.document() }
        )
    }

    suspend fun overview(): MobileOverview {
        val payload = request("/api/mobile/overview")
        val caps = payload.optJSONObject("capabilities") ?: JSONObject()
        return MobileOverview(
            payload.array("invites").map { WorkspaceInvite(it.string("id"), it.string("workspace_name"), it.string("role"), it.string("expires_at")) },
            payload.array("jobs").map {
                ServiceJob(it.string("id"), it.string("title"), it.nullable("scheduled_for"), it.string("priority"), it.string("status"), it.string("asset_name"), it.nullable("customer_name"))
            },
            caps.optBoolean("professional"),
            caps.optBoolean("business")
        )
    }

    suspend fun createAsset(draft: AssetDraft): Asset {
        val payload = JSONObject()
            .put("name", draft.name).put("category", draft.category)
            .put("manufacturer", draft.manufacturer).put("model", draft.model)
            .put("serialNumber", draft.serialNumber).put("purchaseDate", draft.purchaseDate)
            .put("warrantyUntil", draft.warrantyUntil).put("nextServiceDate", draft.nextServiceDate)
            .put("location", draft.location).put("notes", draft.notes)
            .put("visibility", draft.visibility).put("serviceIntervalMonths", draft.serviceIntervalMonths)
        return request("/api/mobile/assets", "POST", payload).objectValue("asset").asset()
    }

    suspend fun action(name: String, configure: JSONObject.() -> Unit = {}) {
        request("/api/mobile/actions", "POST", JSONObject().put("action", name).apply(configure))
    }

    suspend fun deleteAccount(password: String, confirmation: String) {
        action("deleteAccount") { put("password", password); put("confirmation", confirmation) }
        cookie = null
    }

    private suspend fun request(path: String, method: String = "GET", body: JSONObject? = null): JSONObject = withContext(Dispatchers.IO) {
        val connection = (URL(BuildConfig.API_URL + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 25_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Accept-Language", if (Locale.getDefault().language == "de") "de" else "en")
            cookie?.let { setRequestProperty("Cookie", it) }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                outputStream.use { it.write(body.toString().toByteArray()) }
            }
        }
        try {
            val code = connection.responseCode
            connection.headerFields["Set-Cookie"]?.firstOrNull()?.substringBefore(';')?.let { cookie = it }
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = if (text.isBlank()) JSONObject() else JSONObject(text)
            if (code !in 200..299) throw NavoApiException(localizedError(json.optString("error", "HTTP_$code")))
            json
        } finally {
            connection.disconnect()
        }
    }

    private fun localizedError(code: String): String {
        val de = Locale.getDefault().language == "de"
        return when (code) {
            "INVALID_CREDENTIALS" -> if (de) "E-Mail oder Passwort ist falsch." else "Email or password is incorrect."
            "RATE_LIMITED" -> if (de) "Zu viele Versuche. Bitte später erneut versuchen." else "Too many attempts. Please try again later."
            "ASSET_LIMIT_REACHED" -> if (de) "Das Pass-Limit deines Tarifs ist erreicht." else "Your plan's pass limit has been reached."
            "INVALID_PASSWORD" -> if (de) "Das Passwort ist falsch." else "The password is incorrect."
            "INVALID_CONFIRMATION" -> if (de) "Bitte das Bestätigungswort eingeben." else "Enter the required confirmation word."
            "FORBIDDEN" -> if (de) "Du hast dafür keine Berechtigung." else "You do not have permission for this action."
            else -> if (de) "Die Anfrage konnte nicht abgeschlossen werden." else "The request could not be completed."
        }
    }
}

private fun String.urlPart() = java.net.URLEncoder.encode(this, Charsets.UTF_8.name())
private fun JSONObject.string(key: String) = optString(key, "")
private fun JSONObject.nullable(key: String) = if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
private fun JSONObject.objectValue(key: String) = optJSONObject(key) ?: JSONObject()
private fun JSONObject.array(key: String): List<JSONObject> {
    val array = optJSONArray(key) ?: JSONArray()
    return (0 until array.length()).mapNotNull { array.optJSONObject(it) }
}

private fun JSONObject.user(key: String): NavoUser {
    val value = objectValue(key)
    return NavoUser(
        value.string("id"), value.string("email"), value.string("name"), value.optString("plan", "Free"),
        value.optInt("reminder_days", 30), value.optString("account_type", "private"),
        value.nullable("company_name"), value.nullable("professional_title")
    )
}

private fun JSONObject.asset() = Asset(
    string("id"), string("public_id"), string("name"), string("category"), nullable("manufacturer"),
    nullable("model"), nullable("serial_number"), nullable("purchase_date"), nullable("warranty_until"),
    nullable("next_service_date"), optInt("service_interval_months", 12), nullable("location"), nullable("notes"),
    optString("visibility", "LINK"), optBoolean("favorite"), nullable("archived_at"), nullable("workspace_name")
)

private fun JSONObject.event() = AssetEvent(
    string("id"), string("title"), string("event_type"), string("event_date"), nullable("description"), nullable("provider")
)

private fun JSONObject.document() = AssetDocument(string("id"), string("title"), string("url"), string("kind"))
