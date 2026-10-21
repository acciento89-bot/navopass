package de.kamilunavo.navopass

import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class ServiceDraftTest {
    private val owner = "00000000-0000-4000-8000-000000000001"
    private val other = "00000000-0000-4000-8000-000000000002"
    private val pass = "00000000-0000-4000-8000-000000000003"
    private fun draft(title: String = "QA Service", description: String = "Original notes", provider: String = "QA", day: String = "2026-10-25") =
        ServiceDraft.create(owner, pass, "QA appliance", day, title, description, provider, ServiceDraftType.SERVICE, 1792540800000L)
    private fun rejects(block: () -> Unit) { try { block(); fail("Expected rejection") } catch (expected: IllegalArgumentException) { } }

    @Test fun strictTextAndCivilDayBounds() {
        assertEquals("ä".repeat(180), draft("ä".repeat(180), "é".repeat(4000), "ö".repeat(200)).title)
        rejects { draft("a".repeat(181)) }; rejects { draft(description = "a".repeat(4001)) }; rejects { draft(provider = "a".repeat(201)) }
        rejects { draft(title = " \n ") }
        listOf("2026-02-29", "2026-04-31", "2026-13-01", "2026-1-02", "2026-10-25T00:00Z").forEach { day -> rejects { draft(day = day) } }
        assertEquals("2024-02-29", draft(day = "2024-02-29").eventDate)
    }
    @Test fun freezeRetryReceiptAndNextRevisionAreExplicit() {
        val value = draft(); val frozen = value.freeze()
        assertEquals(ServiceDraftState.PUBLISHING, value.state)
        assertEquals(frozen, value.retrySubmission())
        rejects { value.edited("Changed", "New notes", "", "2026-10-25", ServiceDraftType.NOTE) }
        value.markUnknown(); assertEquals(frozen, value.retrySubmission())
        rejects { value.accept(pass, 2, frozen.digest) }; rejects { value.accept(pass, 1, "0".repeat(64)) }
        value.accept(pass, 1, frozen.digest)
        assertEquals(ServiceDraftState.DELIVERED, value.state)
        val edited = value.edited("New revision", "New notes", "", "2026-10-26", ServiceDraftType.NOTE)
        assertEquals(2, edited.revision); assertEquals(value.draftId, edited.draftId); assertEquals(owner, edited.ownerId); assertNull(edited.receipt)
    }
    @Test fun actualFileColdReadAndWriteFailurePreserveBytes() {
        val dir = Files.createTempDirectory("navopass-draft-test").toFile()
        try {
            val file = dir.resolve("drafts.json"); val archive = ServiceDraftArchive(file, owner)
            assertEquals(0, archive.load().revision)
            val value = draft(); val frozen = value.freeze(); value.markUnknown()
            assertEquals(1, archive.save(0, listOf(value)).revision)
            val cold = ServiceDraftArchive(file, owner).load()
            assertEquals(frozen, cold.drafts.single().retrySubmission())
            rejects { archive.save(0, listOf(value)) }; rejects { ServiceDraftArchive(file, other).load() }
            val bytes = file.readBytes()
            val failing = ServiceDraftArchive(file, owner) { _, _ -> throw IllegalArgumentException("disk full") }
            failing.load(); rejects { failing.save(1, listOf(draft())) }; assertArrayEquals(bytes, file.readBytes())
            listOf("not-json", "{\"schemaVersion\":999}").forEach { corrupt ->
                file.writeText(corrupt); rejects { archive.save(1, listOf(draft())) }; assertEquals(corrupt, file.readText())
            }
        } finally { dir.deleteRecursively() }
    }
    @Test fun hundredDraftAndDuplicateIdentityBounds() {
        val dir = Files.createTempDirectory("navopass-draft-bound").toFile()
        try {
            val archive = ServiceDraftArchive(dir.resolve("drafts.json"), owner); archive.load()
            val hundred = List(100) { draft() }; assertEquals(100, archive.save(0, hundred).drafts.size)
            rejects { archive.save(1, hundred + draft()) }
            val one = draft(); rejects { archive.save(1, listOf(one, one)) }
        } finally { dir.deleteRecursively() }
    }
}
