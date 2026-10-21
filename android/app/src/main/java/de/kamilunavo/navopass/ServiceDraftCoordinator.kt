package de.kamilunavo.navopass

import java.io.File
import java.util.UUID
import org.json.JSONObject
import org.json.JSONTokener

enum class ServiceDraftPublishFailure { UNAUTHENTICATED, FORBIDDEN, CONFLICT, UNKNOWN }
class ServiceDraftPublishException(val reason:ServiceDraftPublishFailure):IllegalArgumentException(reason.name)
data class ServiceDraftAccountToken(val ownerId:String,val generation:Int)
data class ServiceDraftVerificationAttempt(val ownerId:String?,val generation:Int)

/** All calls, including transport completion, belong to the UI thread. No automatic publication. */
class ServiceDraftCoordinator(base:File,
    private val transport:(FrozenServiceDraft,(Result<ServiceDraftReceipt>)->Unit)->Unit,
    writer:((ByteArray,File)->Unit)?=null,purger:((File)->Unit)?=null) {
    private val base=File(base,"service-drafts")
    private val writer=writer ?: ::writeDraftAtomic
    private val purger=purger ?: { file:File -> require(!file.exists() || file.delete()) }
    var drafts:List<ServiceDraft> = emptyList();private set
    var contexts:List<ServiceDraftPassContext> = emptyList();private set
    var currentOwner:String?=null;private set
    var locked=true;private set
    var actionFailed=false;private set
    var generation=0;private set
    var sending:Set<String> = emptySet();private set
    var onChanged:()->Unit = {}
    private var archive:ServiceDraftArchive?=null
    private var snapshot:ServiceDraftSnapshot?=null
    private var pendingOwner:String?=null
    private val barrier get()=File(base,"owner-barrier.json")
    private fun ownerFile(owner:String)=File(base,"$owner.json")
    private fun validOwner(owner:String):String {
        require(Regex("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}").matches(owner))
        return UUID.fromString(owner).toString()
    }
    fun authenticate(ownerId:String) {
        generation++;hide();actionFailed=false
        try {
            val owner=validOwner(ownerId)
            pendingOwner?.let { purgeOwner(it);pendingOwner=null }
            readBarrier()?.let { if(it.second || it.first!=owner)purgeOwner(it.first) }
            writeBarrier(owner,false)
            val store=ServiceDraftArchive(ownerFile(owner),owner,writer);val value=store.load()
            archive=store;snapshot=value;drafts=value.drafts;contexts=value.contexts;currentOwner=owner;locked=false
        } catch(error:Exception) {hide();actionFailed=true;throw IllegalArgumentException("Draft journal locked",error)}
        finally {onChanged()}
    }
    fun suspendAuthentication() {generation++;hide();onChanged()}
    fun deactivate() {
        val owner=currentOwner;generation++;hide()
        try {
            val purge=owner ?: pendingOwner ?: readBarrier()?.first ?: return
            pendingOwner=purge;writeBarrier(purge,true);purgeOwner(purge);pendingOwner=null;actionFailed=false
        } catch(error:Exception) {actionFailed=true;throw IllegalArgumentException("Draft cleanup pending",error)}
        finally {onChanged()}
    }
    /** Server-confirmed deletion authorizes removing this owner's bytes even when decoding is locked. */
    fun accountDeletionCompleted(owner:String,expectedGeneration:Int,success:Boolean) {
        if(!success || expectedGeneration!=generation || (currentOwner!=null && currentOwner!=owner))return
        if(runCatching {validOwner(owner)==owner}.getOrDefault(false).not())return
        generation++;hide()
        try {
            val exists=barrier.exists();val metadata=runCatching {readBarrier()}.getOrNull()
            if(exists && (metadata==null || metadata.first!=owner)) {
                // Do not replace an unknown/future or different owner's barrier during own-file cleanup.
                purger(ownerFile(owner));actionFailed=false;return
            }
            pendingOwner=owner;writeBarrier(owner,true);purgeOwner(owner);pendingOwner=null;actionFailed=false
        } catch(_:Exception) {actionFailed=true}
        finally {onChanged()}
    }
    fun capturePass(owner:String,expectedGeneration:Int,pass:String,label:String,canEdit:Boolean) = action {
        require(!locked && currentOwner==owner && generation==expectedGeneration)
        val context=ServiceDraftPassContext(owner,pass,label,canEdit,System.currentTimeMillis());context.validate()
        commit(drafts,contexts.filter {it.passId!=pass}+context)
    }
    fun create(pass:String,day:String,title:String,notes:String,provider:String,type:ServiceDraftType):ServiceDraft = action {
        require(!locked);val owner=requireNotNull(currentOwner)
        val context=requireNotNull(contexts.firstOrNull {it.ownerId==owner && it.passId==pass})
        val draft=ServiceDraft.create(owner,pass,context.label,day,title,notes,provider,type)
        commit(drafts+draft);draft
    }
    fun update(id:String,day:String,title:String,notes:String,provider:String,type:ServiceDraftType) = action {
        val current=requireNotNull(drafts.firstOrNull {it.draftId==id})
        replacing(current.edited(title,notes,provider,day,type))
    }
    fun publish(id:String) {
        val owner=currentOwner;val epoch=generation
        if(locked || owner==null || id in sending) {actionFailed=true;onChanged();return}
        try {
            val pending=requireNotNull(drafts.firstOrNull {it.draftId==id}).detachedCopy()
            val command=if(pending.state==ServiceDraftState.LOCAL)pending.freeze() else pending.retrySubmission()
            replacing(pending) // Durable frozen command before any network side effect.
            sending=sending+id;onChanged()
            transport(command) { result ->
                if(epoch!=generation || owner!=currentOwner || locked)return@transport
                sending=sending-id
                try {
                    val receipt=result.getOrThrow()
                    val current=requireNotNull(drafts.firstOrNull {it.draftId==id}).detachedCopy()
                    require(current.retrySubmission()==command)
                    current.accept(receipt.eventId,receipt.revision,receipt.digest)
                    replacing(current) // Persist receipt before publishing delivered UI.
                } catch(error:Exception) {failedPublication(id,error)}
                onChanged()
            }
        } catch(error:Exception) {
            if(epoch==generation && owner==currentOwner) {sending=sending-id;failedPublication(id,error);onChanged()}
        }
    }
    private fun failedPublication(id:String,error:Exception) {
        actionFailed=true
        val failure=(error as? ServiceDraftPublishException)?.reason
        if(failure==ServiceDraftPublishFailure.UNAUTHENTICATED) {suspendAuthentication();actionFailed=true;return}
        val current=drafts.firstOrNull {it.draftId==id}?.detachedCopy() ?: return
        if(current.state==ServiceDraftState.PUBLISHING || current.state==ServiceDraftState.UNKNOWN) {
            if(failure==ServiceDraftPublishFailure.FORBIDDEN || failure==ServiceDraftPublishFailure.CONFLICT)current.markBlocked() else current.markUnknown()
            runCatching {replacing(current)};actionFailed=true
        }
    }
    private inline fun <T> action(block:()->T):T {
        try {return block()} catch(error:Exception) {actionFailed=true;throw error} finally {onChanged()}
    }
    private fun commit(values:List<ServiceDraft>,newContexts:List<ServiceDraftPassContext> = contexts) {
        require(!locked && currentOwner!=null && values.all {it.ownerId==currentOwner})
        val saved=requireNotNull(archive).save(requireNotNull(snapshot).revision,values,newContexts)
        snapshot=saved;drafts=saved.drafts;contexts=saved.contexts;actionFailed=false
    }
    private fun replacing(value:ServiceDraft) {
        require(drafts.any {it.draftId==value.draftId});commit(drafts.map {if(it.draftId==value.draftId)value else it})
    }
    private fun hide() {currentOwner=null;drafts=emptyList();contexts=emptyList();sending=emptySet();archive=null;snapshot=null;locked=true}
    private fun readBarrier():Pair<String,Boolean>? {
        if(!barrier.exists())return null
        require(barrier.length()<=1024)
        val bytes=barrier.readBytes();require(bytes.size<=1024)
        val text=Charsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString()
        val tokener=JSONTokener(text);val value=tokener.nextValue() as? JSONObject ?: throw IllegalArgumentException("Barrier object")
        require(tokener.nextClean()=='\u0000' && value.get("schemaVersion")==1)
        val owner=value.get("ownerId") as? String ?: throw IllegalArgumentException("Barrier owner")
        require(validOwner(owner)==owner)
        return owner to (value.get("purgePending") as? Boolean ?: throw IllegalArgumentException("Barrier pending"))
    }
    private fun writeBarrier(owner:String,pending:Boolean) {
        writer(JSONObject().put("schemaVersion",1).put("ownerId",owner).put("purgePending",pending).toString().toByteArray(Charsets.UTF_8),barrier)
    }
    private fun purgeOwner(owner:String) {
        require(validOwner(owner)==owner);purger(ownerFile(owner));require(!barrier.exists() || barrier.delete())
    }
}
class ServiceDraftSessionAdapter(val coordinator:ServiceDraftCoordinator) {
    fun verifiedSession(owner:String)=coordinator.authenticate(owner)
    fun beginVerification(owner:String?=null)=ServiceDraftVerificationAttempt(owner,coordinator.generation)
    fun verifiedSession(owner:String,attempt:ServiceDraftVerificationAttempt):Boolean {
        if(attempt.generation!=coordinator.generation)return false
        if(attempt.ownerId!=null && attempt.ownerId!=owner) {coordinator.suspendAuthentication();return false}
        if(coordinator.currentOwner==owner && !coordinator.locked)return true
        coordinator.authenticate(owner);return true
    }
    fun sessionUnavailable()=coordinator.suspendAuthentication()
    fun willLogout() {runCatching {coordinator.deactivate()}}
    fun beginAuthorizedOperation(owner:String):ServiceDraftAccountToken? =
        if(!coordinator.locked && coordinator.currentOwner==owner)ServiceDraftAccountToken(owner,coordinator.generation) else null
    fun loadedPass(token:ServiceDraftAccountToken,pass:String,label:String,canEdit:Boolean)=
        coordinator.capturePass(token.ownerId,token.generation,pass,label,canEdit)
    /** Capture only from the existing authenticated API user, before awaiting its deletion request. */
    fun beginAccountDeletion(owner:String):ServiceDraftAccountToken? {
        if(!Regex("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}").matches(owner))return null
        if(coordinator.currentOwner!=null && coordinator.currentOwner!=owner)return null
        return ServiceDraftAccountToken(owner,coordinator.generation)
    }
    fun accountDeletionFinished(token:ServiceDraftAccountToken?,success:Boolean) {
        if(token!=null)coordinator.accountDeletionCompleted(token.ownerId,token.generation,success)
    }
}
