package de.kamilunavo.navopass
import java.nio.file.Files
import org.junit.Assert.*
import org.junit.Test
class ServiceDraftVerificationTest {
 @Test fun lateVerifiedSessionCannotPurgeNewOwnerOrReopenAfterLogout() {
  val a="00000000-0000-4000-8000-000000000001";val b="00000000-0000-4000-8000-000000000002";val pass="00000000-0000-4000-8000-000000000003"
  val root=Files.createTempDirectory("navopass-verification").toFile()
  try {
   val store=ServiceDraftCoordinator(root,{_,_->});val adapter=ServiceDraftSessionAdapter(store)
   adapter.verifiedSession(a);val attempt=adapter.beginVerification(a)
   adapter.willLogout();adapter.verifiedSession(b);val token=adapter.beginAuthorizedOperation(b)!!
   adapter.loadedPass(token,pass,"QA B",true);store.create(pass,"2026-10-25","B private","Only B","",ServiceDraftType.NOTE)
   val file=java.io.File(root,"service-drafts/$b.json");val before=file.readBytes()
   assertFalse(adapter.verifiedSession(a,attempt));assertEquals(b,store.currentOwner);assertArrayEquals(before,file.readBytes())
   val pending=adapter.beginVerification(b);adapter.willLogout()
   assertFalse(adapter.verifiedSession(b,pending));assertNull(store.currentOwner)
   adapter.verifiedSession(b);val mismatch=adapter.beginVerification(b)
   assertFalse(adapter.verifiedSession(a,mismatch));assertNull(store.currentOwner)
   assertTrue(adapter.verifiedSession(b,adapter.beginVerification()));assertEquals(b,store.currentOwner)
  } finally {root.deleteRecursively()}
 }
}
