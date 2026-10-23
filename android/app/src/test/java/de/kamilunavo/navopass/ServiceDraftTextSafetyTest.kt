package de.kamilunavo.navopass
import org.junit.Assert.*
import org.junit.Test
class ServiceDraftTextSafetyTest {
    @Test fun postgresTextCannotContainNul() {
        for(field in 0..2) {
            var rejected=false
            try {ServiceDraft.create("00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","QA","2026-10-25",if(field==0)"QA\u0000note" else "QA",if(field==1)"Original\u0000note" else "Original",if(field==2)"QA\u0000provider" else "QA",ServiceDraftType.SERVICE)}catch(expected:IllegalArgumentException){rejected=true}
            assertTrue("PostgreSQL cannot store NUL field $field",rejected)
        }
    }
    @Test fun canonicalUtf8Fixture() {
        val command=FrozenServiceDraft("00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002","00000000-0000-4000-8000-000000000003",1,"2026-10-25","QA Service","Original\nnotes ä </script>","QA",ServiceDraftType.SERVICE)
        assertEquals("afaa60edb2000869bb5506dc5135c61b46e9693e037e7be01590fd178c54e84f",command.digest)
        assertTrue(command.wireText.contains("ä </script>"))
    }
}
