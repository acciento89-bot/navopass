import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

test('patched mail runtime still composes a message without any network delivery', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const message = await transport.sendMail({
    from: 'NavoPass QA <sender@example.invalid>', to: 'recipient@example.invalid',
    subject: 'SYNTHETIC service note', text: 'Locally composed QA message. No SMTP connection.',
    html: '<p>SYNTHETIC private service note</p>',
  });
  assert.equal(message.envelope.from, 'sender@example.invalid');
  assert.deepEqual(message.envelope.to, ['recipient@example.invalid']);
  const mime = message.message.toString('utf8');
  assert.match(mime, /Subject: SYNTHETIC service note/);
  assert.match(mime, /multipart\/alternative/);
  assert.match(mime, /SYNTHETIC private service note/);
});
