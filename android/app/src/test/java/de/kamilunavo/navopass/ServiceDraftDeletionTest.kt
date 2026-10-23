package de.kamilunavo.navopass
import java.nio.file.Files
import java.io.File
import org.junit.Assert.*
import org.junit.Test
class ServiceDraftDeletionTest {
 @Test fun confirmedDeletionPurgesUnreadableOwnerButFailureAndLateCompletionDoNot() {
  val a="00000000-0000-4000-8000-000000000001";val b="00000000-0000-4000-8000-000000000002";val pass="00000000-0000-4000-8000-000000000003"
  val root=Files.createTempDirectory("navopass-delete").toFile()
  try {
   val store=ServiceDraftCoordinator(root,{_,_->});val adapter=ServiceDraftSessionAdapter(store)
   adapter.verifiedSession(a);val token=adapter.beginAuthorizedOperation(a)!!
   adapter.loadedPass(token,pass,"QA A",true);store.create(pass,"2026-10-25","A private","Own A","",ServiceDraftType.NOTE)
   adapter.sessionUnavailable();val file=File(root,"service-drafts/$a.json");val corrupt="unreadable original A bytes".toByteArray();file.writeBytes(corrupt)
   runCatching {adapter.verifiedSession(a)};assertTrue(store.locked)
   val deleting=adapter.beginAccountDeletion(a)
   adapter.accountDeletionFinished(deleting,false);assertArrayEquals(corrupt,file.readBytes())
   adapter.accountDeletionFinished(deleting,true);assertFalse("Confirmed successful deletion must purge unreadable own journal",file.exists());assertNull(store.currentOwner)
   adapter.verifiedSession(b);val bt=adapter.beginAuthorizedOperation(b)!!
   adapter.loadedPass(bt,pass,"QA B",true);store.create(pass,"2026-10-25","B private","Own B","",ServiceDraftType.NOTE)
   val bf=File(root,"service-drafts/$b.json");val before=bf.readBytes()
   adapter.accountDeletionFinished(deleting,true);assertEquals(b,store.currentOwner);assertArrayEquals(before,bf.readBytes())
  } finally {root.deleteRecursively()}
 }
}
