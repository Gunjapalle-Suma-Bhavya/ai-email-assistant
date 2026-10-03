import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { emailService } from '../../services/emailService';
import { useToast } from '../../context/ToastContext';

export default function ComposeModal({ isOpen, onClose, onCreated }) {
  const { showToast } = useToast();
  const [author, setAuthor] = useState('');
  const [to, setTo] = useState('lance@company.com');
  const [subject, setSubject] = useState('');
  const [emailThread, setEmailThread] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author || !subject || !emailThread) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      setLoading(true);
      await emailService.createEmail({
        author,
        to,
        subject,
        email_thread: emailThread,
      });
      showToast('Email received in inbox successfully!', 'success');
      setAuthor('');
      setSubject('');
      setEmailThread('');
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      showToast(err.message || 'Failed to inject email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inject Incoming Test Email"
      description="Simulate an incoming message to test autonomous AI triage and reply generation."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="From / Sender"
          placeholder="e.g. Dr. Jane Foster <jane@university.edu>"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <Input
          label="To / Recipient"
          placeholder="lance@company.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
        <Input
          label="Subject"
          placeholder="e.g. Urgent review needed for Grant Proposal"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono font-medium text-[#6B665F] tracking-wider uppercase">
            Email Message Content
          </label>
          <textarea
            rows={5}
            className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] font-serif-body text-sm rounded-[2px] p-3 transition focus:outline-none focus:border-[#1E3A5F]"
            placeholder="Write or paste the email body here..."
            value={emailThread}
            onChange={(e) => setEmailThread(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCD5C9]">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={loading}>
            Inject Into Inbox
          </Button>
        </div>
      </form>
    </Modal>
  );
}
