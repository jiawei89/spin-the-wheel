"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { type UiStrings } from "@/lib/ui-strings";
import { track } from "@/lib/analytics";

type Status = { kind: "idle" | "sending" | "sent" | "error"; text: string };
type ToolState = "idle" | "working" | "success" | "error";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The opening example is the tool's first acceptance sample, so the form
// opens ready for that first send. Every field stays editable.
const SAMPLE_EMAIL = "ms.rivera@school.edu";
const SAMPLE_TOPIC = "question";
const SAMPLE_MESSAGE = "Can I import a roster from a CSV?";

export default function ContactForm({ t, ownsState = true }: { t: UiStrings; ownsState?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(SAMPLE_EMAIL);
  const [topic, setTopic] = useState(SAMPLE_TOPIC);
  const [message, setMessage] = useState(SAMPLE_MESSAGE);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [blocker, setBlocker] = useState("");

  const toolState: ToolState =
    status.kind === "sending" ? "working" : status.kind === "sent" ? "success" : status.kind === "error" ? "error" : "idle";

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
        setBlocker("");
        setDocState("error");
        return;
      }
      if (!cleanMessage) {
        setStatus({ kind: "error", text: t.errorMessage });
        setBlocker("");
        setDocState("error");
        return;
      }
      setStatus({ kind: "sending", text: t.contactSending });
      setBlocker("");
      setDocState("working");
      track("task_start", { tool: "contact-message" });
      let ok = false;
      let failure = "";
      let code = "";
      try {
        const res = await fetch("/api/_site/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, topic, message: cleanMessage }),
        });
        ok = res.ok;
        if (!ok) {
          try {
            const data = (await res.json()) as { error?: string; message?: string };
            if (typeof data.error === "string") code = data.error;
            if (typeof data.message === "string") failure = data.message;
          } catch {
            /* the route answered without a JSON body */
          }
        }
      } catch {
        ok = false;
      }
      if (ok) {
        setStatus({ kind: "sent", text: t.messageSent });
        setBlocker("");
        setDocState("success");
        track("task_complete", { tool: "contact-message" });
        return;
      }
      setBlocker(code || "unreachable");
      setStatus({ kind: "error", text: failure || t.contactUnavailable });
      setDocState("error");
    },
    [name, email, topic, message, t, setDocState],
  );

  const onName = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const onEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setBlocker("");
    setStatus((s) => (s.kind === "error" ? { kind: "idle", text: "" } : s));
  };
  const onMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setStatus((s) => (s.kind === "error" ? { kind: "idle", text: "" } : s));
  };

  const topics = [
    { value: "question", label: t.topicQuestion },
    { value: "bug", label: t.topicBug },
    { value: "business", label: t.topicBusiness },
    { value: "billing", label: t.topicBilling },
  ];

  return (
    <form
      className="contact-form"
      data-shipsite-contact
      data-capability="contact-message"
      data-operation="tool-spec"
      data-state={toolState}
      data-tool-blocker={blocker || undefined}
      noValidate
      onSubmit={submit}
    >
      <div className="field">
        <label htmlFor="contactTopic">{t.contactTopicLabel}</label>
        <select id="contactTopic" data-contact-topic data-tool-input="topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {topics.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="contactName">{t.contactNameLabel}</label>
          <input
            id="contactName"
            data-contact-name
            data-tool-input="name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Jane Rivera"
            value={name}
            onChange={onName}
          />
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
            placeholder="you@school.edu"
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
          placeholder="What happened, and what did you expect?"
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
            setName("");
            setEmail(SAMPLE_EMAIL);
            setTopic(SAMPLE_TOPIC);
            setMessage(SAMPLE_MESSAGE);
            setStatus({ kind: "idle", text: "" });
            setBlocker("");
          }}
        >
          {t.contactSampleLink}
        </button>
        <span className="example-credit" data-shipsite-example-credit>
          {t.contactSampleCredit}
        </span>
      </p>
      <div className="capability-actions">
        <button
          type="submit"
          className="btn-primary primary"
          data-jtbd-action="send"
          disabled={status.kind === "sending"}
          aria-busy={status.kind === "sending"}
        >
          {status.kind === "sending" ? t.contactSending : t.contactSend}
        </button>
      </div>
      <p
        className="status-line"
        data-contact-status
        data-shipsite-status
        data-tool-output
        role="status"
        aria-live="polite"
        data-kind={status.kind}
      >
        {status.text}
      </p>
    </form>
  );
}
