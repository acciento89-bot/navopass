package de.kamilunavo.navopass

import java.nio.file.Files
import org.junit.Assert.*
import org.junit.Test

class ServiceDraftCoordinatorTest {
    private val a="00000000-0000-4000-8000-000000000001"
    private val b="00000000-0000-4000-8000-000000000002"
    private val pass="00000000-0000-4000-8000-000000000003"
    private fun rejects(action:()->Unit) { try {action();fail("Expected rejection")} catch(expected:IllegalArgumentException){} }
    @Test fun freezeBeforeTransportReceiptDiskFailureAndExactRetry() {
        val root=Files.createTempDirectory("navopass-coord").toFile()
        try {
            var full=false
            val sent=mutableListOf<FrozenServiceDraft>();val callbacks=mutableListOf<(Result<ServiceDraftReceipt>)->Unit>()
            val coordinator=ServiceDraftCoordinator(root,{command,callback->sent+=command;callbacks+=callback},writer={bytes,file->
                if(full)throw IllegalArgumentException("full");file.parentFile!!.mkdirs();file.writeBytes(bytes)
            })
            val adapter=ServiceDraftSessionAdapter(coordinator)
            assertNull(adapter.beginAuthorizedOperation(a));adapter.verifiedSession(a)
            rejects {coordinator.create(pass,"2026-10-25","QA","Original","",ServiceDraftType.NOTE)}
            val token=adapter.beginAuthorizedOperation(a)!!
            rejects {adapter.loadedPass(token,pass,"QA",false)}
            adapter.loadedPass(token,pass,"QA",true)
            val draft=coordinator.create(pass,"2026-10-25","QA","Original","",ServiceDraftType.NOTE)
            coordinator.publish(draft.draftId);assertEquals(1,sent.size)
            val frozen=sent.single()
            val cold=ServiceDraftCoordinator(root,{_,callback->callback(Result.failure(IllegalArgumentException("offline")))})
            cold.authenticate(a);assertEquals(frozen,cold.drafts.single().retrySubmission())
            full=true;callbacks.removeAt(0)(Result.success(ServiceDraftReceipt(pass,frozen.revision,frozen.digest)))
            assertNotEquals(ServiceDraftState.DELIVERED,coordinator.drafts.single().state);assertTrue(coordinator.actionFailed)
            full=false;coordinator.publish(draft.draftId);assertEquals(frozen,sent.last())
            callbacks.removeAt(0)(Result.success(ServiceDraftReceipt(pass,frozen.revision,frozen.digest)))
            assertEquals(ServiceDraftState.DELIVERED,coordinator.drafts.single().state)
            adapter.sessionUnavailable();assertNull(coordinator.currentOwner);assertTrue(coordinator.drafts.isEmpty())
            adapter.verifiedSession(a);assertEquals(1,coordinator.drafts.size)
        } finally {root.deleteRecursively()}
    }
    @Test fun lateOwnerCallbacksAndSuccessfulDeletionCannotCrossAccounts() {
        val root=Files.createTempDirectory("navopass-owners").toFile()
        try {
            var callback:((Result<ServiceDraftReceipt>)->Unit)?=null;var frozen:FrozenServiceDraft?=null
            val coordinator=ServiceDraftCoordinator(root,{body,done->frozen=body;callback=done});val adapter=ServiceDraftSessionAdapter(coordinator)
            adapter.verifiedSession(a);val old=adapter.beginAuthorizedOperation(a)!!;adapter.loadedPass(old,pass,"QA A",true)
            val draft=coordinator.create(pass,"2026-10-25","QA A","Original","",ServiceDraftType.NOTE)
            coordinator.publish(draft.draftId);adapter.willLogout();assertTrue(coordinator.drafts.isEmpty())
            adapter.verifiedSession(b);callback!!(Result.success(ServiceDraftReceipt(pass,frozen!!.revision,frozen!!.digest)))
            assertEquals(b,coordinator.currentOwner);assertTrue(coordinator.drafts.isEmpty())
            rejects {adapter.loadedPass(old,pass,"Late A",true)}
            val current=adapter.beginAuthorizedOperation(b)!!;adapter.loadedPass(current,pass,"QA B",true)
            coordinator.create(pass,"2026-10-25","QA B","Only B","",ServiceDraftType.NOTE)
            adapter.accountDeletionFinished(old,true);assertEquals(1,coordinator.drafts.size)
            adapter.accountDeletionFinished(current,false);assertEquals(1,coordinator.drafts.size)
            adapter.accountDeletionFinished(current,true);assertNull(coordinator.currentOwner)
            adapter.verifiedSession(b);assertTrue(coordinator.drafts.isEmpty())
        } finally {root.deleteRecursively()}
    }
    @Test fun failedPurgeLocksAndDurableMarkerSurvivesColdCoordinator() {
        val root=Files.createTempDirectory("navopass-purge").toFile()
        try {
            var fail=false
            val coordinator=ServiceDraftCoordinator(root,{_,_->},purger={file->if(fail)throw IllegalArgumentException("purge");if(file.exists())require(file.delete())})
            coordinator.authenticate(a);coordinator.capturePass(a,coordinator.generation,pass,"QA",true)
            coordinator.create(pass,"2026-10-25","QA","Own","",ServiceDraftType.NOTE)
            fail=true;rejects {coordinator.deactivate()};assertTrue(coordinator.locked);assertTrue(coordinator.drafts.isEmpty())
            val cold=ServiceDraftCoordinator(root,{_,_->},purger={throw IllegalArgumentException("purge")})
            rejects {cold.authenticate(b)};assertTrue(cold.drafts.isEmpty());assertTrue(cold.locked)
            fail=false;coordinator.authenticate(b);assertTrue(coordinator.drafts.isEmpty());assertFalse(coordinator.locked)
        } finally {root.deleteRecursively()}
    }
}
