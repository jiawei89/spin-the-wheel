"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { type UiStrings } from "@/lib/ui-strings";
import { track } from "@/lib/analytics";

type Status = { kind: "idle" | "sending" | "sent" | "error"; text: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactForm({ t, ownsState = true }: { t: UiStrings; ownsState?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("question");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });

  useEffect(() => {
    if (ownsState) document.documentElement.dataset.state = "ready";
  }, [ownsState]);

  const setDocState = useCallback(
    (s: "ready" | "working" | "success" | "error") => {
      if (ownsState) document.documentElement.dataset.state = s;
    },
    [ownsState],
  );

  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const cleanEmail = email.trim();
      const cleanMessage = message.trim();
      if (!EMAIL.test(cleanEmail)) {
        setStatus({ kind: "error", text: t.errorEmail });
        setDocState("error");
        return;
      }
      if (!cleanMessage) {
        setStatus({ kind: "error", text: t.errorMessage });
        setDocState("error");
        return;
      }
      setStatus({ kind: "sending", text: t.contactSending });
      setDocState("working");
      track("task_start", { tool: "contact-message" });
      let ok = false;
      try {
        const res = await fetch("/api/_site/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, topic, message: cleanMessage }),
        });
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (ok) {
        setStatus({ kind: "sent", text: t.messageSent });
        setDocState("success");
        track("task_complete", { tool: "contact-message" });
        return;
      }
      setStatus({ kind: "error", text: t.contactUnavailable });
      setDocState("error");
    },
    [name, email, topic, message, t, setDocState],
  );

  const onName = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const onEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setStatus((s) => (s.kind === "error" ? { kind: "idle", text: "" } : s));
  };
  const onMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setStatus((s) => (s.kind === "error" ? { kind: "idle", text: "" } : s));
  };

  return (
    <form
      className="contact-form"
      data-shipsite-contact
      data-capability="contact-message"
      data-operation="send"
      noValidate
      onSubmit={submit}
    >
      <div className="field">
        <label htmlFor="contactTopic">{t.contactTopicLabel}</label>
        <select id="contactTopic" data-contact-topic data-tool-input value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="question">{t.topicQuestion}</option>
          <option value="bug">{t.topicBug}</option>
          <option value="business">{t.topicBusiness}</option>
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="contactName">{t.contactNameLabel}</label>
          <input id="contactName" data-contact-name data-tool-input="name" type="text" name="name" autoComplete="name" value={name} onChange={onName} />
        </div>
        <div className="field">
          <label htmlFor="contactEmail">{t.contactEmailLabel}</label>
          <input
            id="contactEmail"
            data-contact-email
            data-tool-input="email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={onEmail}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="contactMessage">{t.contactMessageLabel}</label>
        <textarea
          id="contactMessage"
          data-contact-message
          data-tool-input="message"
          name="message"
          rows={6}
          value={message}
          onChange={onMessage}
        />
      </div>
      <p className="examplerow">
        <button
          type="button"
          className="quiet-link"
          data-shipsite-example
          onClick={() => {
            setName("Ms. Rivera");
            setEmail("ms.rivera@school.edu");
            setTopic("question");
            setMessage("Can I import a roster from a CSV?");
            setStatus({ kind: "idle", text: "" });
          }}
        >
          {t.contactSampleLink}
        </button>
        <span className="example-credit" data-shipsite-example-credit>
          {t.contactSampleCredit}
        </span>
      </p>
      <div className="capability-actions">
        <button type="submit" className="btn-primary primary" data-jtbd-action="send" disabled={status.kind === "sending"} aria-busy={status.kind === "sending"}>
          {status.kind === "sending" ? t.contactSending : t.contactSend}
        </button>
      </div>
      <p className="status-line" data-contact-status data-shipsite-status data-tool-output role="status" aria-live="polite" data-kind={status.kind}>
        {status.text}
      </p>
    </form>
  );
}
