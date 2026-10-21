package de.kamilunavo.navopass

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.UUID

data class ServiceDraftSnapshot(val revision: Int, val drafts: List<ServiceDraft>, val contexts: List<ServiceDraftPassContext> = emptyList())

class ServiceDraftArchive(private val file: File, private val ownerId: String,
    private val writer: (ByteArray, File) -> Unit = ::writeDraftAtomic) {
    private var readBefore = false
    private var lastBytes: ByteArray? = null
    fun load(): ServiceDraftSnapshot {
        val bytes = readBytes(); val result = bytes?.let(::decode) ?: ServiceDraftSnapshot(0, emptyList())
        require(Regex("[0-9a-fA-F-]{36}").matches(ownerId)); UUID.fromString(ownerId)
        lastBytes = bytes; readBefore = true; return result
    }
    fun save(expectedRevision: Int, drafts: List<ServiceDraft>, contexts: List<ServiceDraftPassContext>? = null): ServiceDraftSnapshot {
        require(readBefore)
        val bytes = readBytes(); val previous = bytes?.let(::decode) ?: ServiceDraftSnapshot(0, emptyList())
        require(sameBytes(bytes, lastBytes) && previous.revision == expectedRevision && expectedRevision < 1_000_000)
        val next = ServiceDraftSnapshot(expectedRevision + 1, drafts, contexts ?: previous.contexts); validate(next)
        val encoded = encode(next).toByteArray(Charsets.UTF_8); require(encoded.size <= MAX_BYTES)
        val preflight = decode(encoded); require(preflight.revision == next.revision)
        require(encode(preflight) == encode(next))
        val fresh = readBytes(); fresh?.let(::decode); require(sameBytes(fresh, bytes))
        writer(encoded, file); lastBytes = encoded; return next
    }
    private fun readBytes(): ByteArray? {
        if (!file.exists()) return null
        require(file.length() <= MAX_BYTES)
        return file.readBytes().also { require(it.size <= MAX_BYTES) }
    }
    private fun validate(snapshot: ServiceDraftSnapshot) {
        require(snapshot.revision in 0..1_000_000 && snapshot.drafts.size <= 100)
        require(snapshot.drafts.map { it.draftId }.toSet().size == snapshot.drafts.size)
        require(snapshot.contexts.size <= 100 && snapshot.contexts.map { it.passId }.toSet().size == snapshot.contexts.size)
        snapshot.contexts.forEach { require(it.ownerId == ownerId); it.validate() }
        snapshot.drafts.forEach { require(it.ownerId == ownerId); it.validate() }
    }
    private fun encode(snapshot: ServiceDraftSnapshot): String = JSONObject().put("schemaVersion", 1).put("ownerId", ownerId)
        .put("revision", snapshot.revision).put("drafts", JSONArray(snapshot.drafts.map { draftJson(it) }))
        .put("contexts", JSONArray(snapshot.contexts.map { JSONObject().put("ownerId",it.ownerId).put("passId",it.passId).put("label",it.label).put("canEditWhenCaptured",it.canEditWhenCaptured).put("observedAt",it.observedAt) })).toString()
    private fun decode(bytes: ByteArray): ServiceDraftSnapshot {
        try {
            val text = Charsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString()
            val tokener = JSONTokener(text); val root = tokener.nextValue() as? JSONObject ?: throw IllegalArgumentException("Archive root")
            require(tokener.nextClean() == '\u0000'); require(integer(root, "schemaVersion") == 1)
            require(string(root, "ownerId") == ownerId)
            val array = root.get("drafts") as? JSONArray ?: throw IllegalArgumentException("Archive drafts")
            require(array.length() <= 100)
            val contexts = if (root.has("contexts")) {
                val c = root.get("contexts") as? JSONArray ?: throw IllegalArgumentException("Contexts required")
                require(c.length()<=100)
                List(c.length()) { i ->
                    val j=c.get(i) as? JSONObject ?: throw IllegalArgumentException("Context object")
                    val time=j.get("observedAt");require(time is Int || time is Long)
                    ServiceDraftPassContext(string(j,"ownerId"),string(j,"passId"),string(j,"label"),j.get("canEditWhenCaptured") as? Boolean ?: throw IllegalArgumentException("Boolean required"),(time as Number).toLong())
                }
            } else emptyList()
            val result = ServiceDraftSnapshot(integer(root, "revision"), List(array.length()) { readDraft(array.get(it) as? JSONObject ?: throw IllegalArgumentException("Draft object")) }, contexts)
            validate(result); return result
        } catch (error: Exception) { throw IllegalArgumentException("Unrecognized service-draft archive; original bytes preserved", error) }
    }
    companion object { const val MAX_BYTES = 2 * 1024 * 1024 }
}
private fun sameBytes(a: ByteArray?, b: ByteArray?) = if (a == null || b == null) a == null && b == null else a.contentEquals(b)
private fun integer(json: JSONObject, key: String): Int {
    val raw = json.get(key); require(raw is Int || raw is Long)
    val value = (raw as Number).toLong(); require(value in 0..Int.MAX_VALUE.toLong()); return value.toInt()
}
private fun string(json: JSONObject, key: String) = json.get(key) as? String ?: throw IllegalArgumentException("String required: $key")
private fun draftJson(value: ServiceDraft): JSONObject {
    val result = JSONObject().put("ownerId", value.ownerId).put("passId", value.passId).put("passLabel", value.passLabel)
        .put("draftId", value.draftId).put("revision", value.revision).put("eventDate", value.eventDate).put("title", value.title)
        .put("description", value.description).put("provider", value.provider).put("eventType", value.eventType.name)
        .put("capturedAt", value.capturedAt).put("state", value.state.name)
    value.frozen?.let { result.put("frozen", JSONObject(it.wireText)) }
    value.receipt?.let { result.put("receipt", JSONObject().put("eventId", it.eventId).put("revision", it.revision).put("digest", it.digest)) }
    return result
}
private fun readDraft(j: JSONObject): ServiceDraft {
    val f = if (j.has("frozen")) j.get("frozen") as? JSONObject ?: throw IllegalArgumentException("Frozen object required") else null
    val frozen = f?.let { FrozenServiceDraft(string(it,"ownerId"),string(it,"passId"),string(it,"draftId"),integer(it,"revision"),string(it,"eventDate"),string(it,"title"),string(it,"description"),string(it,"provider"),ServiceDraftType.valueOf(string(it,"eventType"))) }
    val r = if (j.has("receipt")) j.get("receipt") as? JSONObject ?: throw IllegalArgumentException("Receipt object required") else null
    val receipt = r?.let { ServiceDraftReceipt(string(it,"eventId"),integer(it,"revision"),string(it,"digest")) }
    val time = j.get("capturedAt"); require(time is Long || time is Int)
    return ServiceDraft.restore(string(j,"ownerId"),string(j,"passId"),string(j,"passLabel"),string(j,"draftId"),integer(j,"revision"),string(j,"eventDate"),string(j,"title"),string(j,"description"),string(j,"provider"),ServiceDraftType.valueOf(string(j,"eventType")),(time as Number).toLong(),ServiceDraftState.valueOf(string(j,"state")),frozen,receipt)
}
internal fun writeDraftAtomic(bytes: ByteArray, destination: File) {
    val parent = requireNotNull(destination.parentFile); require(parent.exists() || parent.mkdirs())
    val temp = File(parent, ".draft-${UUID.randomUUID()}.tmp")
    try {
        FileOutputStream(temp).use { it.write(bytes); it.fd.sync() }
        Files.move(temp.toPath(), destination.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
    } finally { temp.delete() }
}
