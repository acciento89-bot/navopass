package de.kamilunavo.navopass

import java.security.MessageDigest
import java.time.LocalDate
import java.util.UUID

enum class ServiceDraftType { NOTE, SERVICE }
enum class ServiceDraftState { LOCAL, PUBLISHING, UNKNOWN, DELIVERED, BLOCKED }
data class ServiceDraftReceipt(val eventId: String, val revision: Int, val digest: String)
data class FrozenServiceDraft(val ownerId: String, val passId: String, val draftId: String, val revision: Int,
    val eventDate: String, val title: String, val description: String, val provider: String, val eventType: ServiceDraftType) {
    val wireText: String get() = "{" + listOf(
        "description" to draftQuote(description), "draftId" to draftQuote(draftId), "eventDate" to draftQuote(eventDate),
        "eventType" to draftQuote(eventType.name), "ownerId" to draftQuote(ownerId), "passId" to draftQuote(passId),
        "provider" to draftQuote(provider), "revision" to revision.toString(), "title" to draftQuote(title)
    ).joinToString(",") { draftQuote(it.first) + ":" + it.second } + "}"
    val digest: String get() = MessageDigest.getInstance("SHA-256").digest(wireText.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 255) }
}

/** Association is immutable; pending revisions can only be retried with the same payload. */
class ServiceDraft private constructor(val ownerId: String, val passId: String, val passLabel: String, val draftId: String,
    val revision: Int, val eventDate: String, val title: String, val description: String, val provider: String,
    val eventType: ServiceDraftType, val capturedAt: Long, initialState: ServiceDraftState,
    initialFrozen: FrozenServiceDraft?, initialReceipt: ServiceDraftReceipt?) {
    var state = initialState; private set
    var frozen = initialFrozen; private set
    var receipt = initialReceipt; private set
    fun detachedCopy() = restore(ownerId, passId, passLabel, draftId, revision, eventDate, title, description, provider, eventType, capturedAt, state, frozen, receipt)
    private fun snapshot() = FrozenServiceDraft(ownerId, passId, draftId, revision, eventDate, title, description, provider, eventType)
    fun freeze(): FrozenServiceDraft {
        require(state == ServiceDraftState.LOCAL); validate()
        return snapshot().also { frozen = it; state = ServiceDraftState.PUBLISHING }
    }
    fun retrySubmission(): FrozenServiceDraft {
        require(state == ServiceDraftState.PUBLISHING || state == ServiceDraftState.UNKNOWN); validate()
        return requireNotNull(frozen)
    }
    fun markUnknown() { require(state == ServiceDraftState.PUBLISHING || state == ServiceDraftState.UNKNOWN); state = ServiceDraftState.UNKNOWN }
    fun markBlocked() { require(state == ServiceDraftState.PUBLISHING || state == ServiceDraftState.UNKNOWN); state = ServiceDraftState.BLOCKED }
    fun accept(eventId: String, revision: Int, digest: String) {
        val command = retrySubmission()
        require(draftUuid(eventId) && revision == command.revision && digest == command.digest)
        receipt = ServiceDraftReceipt(eventId, revision, digest); state = ServiceDraftState.DELIVERED
    }
    fun edited(title: String, description: String, provider: String, eventDate: String, eventType: ServiceDraftType): ServiceDraft {
        require(state in setOf(ServiceDraftState.LOCAL, ServiceDraftState.DELIVERED, ServiceDraftState.BLOCKED)); require(revision < 1_000_000)
        return restore(ownerId, passId, passLabel, draftId, revision + 1, eventDate, title.trim(), description, provider, eventType, capturedAt, ServiceDraftState.LOCAL, null, null)
    }
    fun validate() {
        require(listOf(ownerId, passId, draftId).all(::draftUuid))
        require(revision in 1..1_000_000 && capturedAt >= 0)
        require(passLabel.isNotBlank() && draftLength(passLabel) <= 300)
        require(title.isNotBlank() && draftLength(title) <= 180)
        require(draftLength(description) <= 4000 && draftLength(provider) <= 200)
        require(listOf(title, description, provider).none { it.contains('\u0000') })
        require(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}").matches(eventDate))
        val day = runCatching { LocalDate.parse(eventDate) }.getOrNull(); require(day != null && day.year >= 1 && day.toString() == eventDate)
        when (state) {
            ServiceDraftState.LOCAL -> require(frozen == null && receipt == null)
            ServiceDraftState.PUBLISHING, ServiceDraftState.UNKNOWN, ServiceDraftState.BLOCKED -> require(frozen == snapshot() && receipt == null)
            ServiceDraftState.DELIVERED -> {
                val accepted = requireNotNull(receipt)
                require(frozen == snapshot() && draftUuid(accepted.eventId) && accepted.revision == revision && accepted.digest == frozen?.digest)
            }
        }
    }
    companion object {
        fun create(ownerId: String, passId: String, passLabel: String, eventDate: String, title: String,
            description: String, provider: String, eventType: ServiceDraftType, capturedAt: Long = System.currentTimeMillis()) =
            restore(ownerId, passId, passLabel, UUID.randomUUID().toString(), 1, eventDate, title.trim(), description, provider, eventType, capturedAt, ServiceDraftState.LOCAL, null, null)
        internal fun restore(ownerId: String, passId: String, passLabel: String, draftId: String, revision: Int, eventDate: String,
            title: String, description: String, provider: String, eventType: ServiceDraftType, capturedAt: Long,
            state: ServiceDraftState, frozen: FrozenServiceDraft?, receipt: ServiceDraftReceipt?) =
            ServiceDraft(ownerId, passId, passLabel, draftId, revision, eventDate, title, description, provider, eventType, capturedAt, state, frozen, receipt).also { it.validate() }
    }
}
private fun draftUuid(value: String) = Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}").matches(value)
private fun draftLength(value: String): Int {
    var index = 0
    while (index < value.length) {
        val c = value[index]
        if (Character.isHighSurrogate(c)) { require(index + 1 < value.length && Character.isLowSurrogate(value[index + 1])); index += 2 }
        else { require(!Character.isLowSurrogate(c)); index += 1 }
    }
    return value.codePointCount(0, value.length)
}
/** JSON.stringify-compatible escaping; no optional solidus escape in the digest contract. */
private fun draftQuote(value: String): String = buildString {
    append('"')
    for (c in value) when (c) {
        '"' -> append("\\\""); '\\' -> append("\\\\"); '\b' -> append("\\b"); '\u000C' -> append("\\f")
        '\n' -> append("\\n"); '\r' -> append("\\r"); '\t' -> append("\\t")
        else -> if (c.code < 32) append("\\u%04x".format(c.code)) else append(c)
    }
    append('"')
}

/** A past online observation, never a substitute for server authorization on publication. */
data class ServiceDraftPassContext(val ownerId:String,val passId:String,val label:String,val canEditWhenCaptured:Boolean,val observedAt:Long) {
    fun validate() { require(draftUuid(ownerId) && draftUuid(passId) && label.isNotBlank() && draftLength(label)<=300 && canEditWhenCaptured && observedAt>=0) }
}
