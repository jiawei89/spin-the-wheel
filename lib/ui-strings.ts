// Every word this site's own code writes for a visitor lives here, keyed.
// Pages pass uiStringsFor(language) into client tools as props; a client
// component never imports lib/site-config.

export type UiStrings = {
  siteName: string;
  skipToContent: string;
  previewNotice: string;
  menuOpen: string;
  menuClose: string;
  signIn: string;
  signOut: string;
  signedInAs: string;
  setWheelTitle: string;
  wheelTitleLabel: string;
  wheelTitlePlaceholder: string;
  wheelTitleSave: string;
  wheelTitleRemove: string;
  stageAriaLabel: string;
  wheelButtonLabel: string;
  tapToSpin: string;
  spinning: string;
  entriesLabel: string;
  entriesCountOne: string;
  entriesCountMany: string;
  presetLabel: string;
  presetSample: string;
  rangeLabel: string;
  rangeFrom: string;
  rangeTo: string;
  rangeSet: string;
  eliminateMode: string;
  removeWinner: string;
  removeWinnerElim: string;
  spinButton: string;
  spinHint: string;
  winnerLabel: string;
  emptyResult: string;
  spinAgain: string;
  countPlusOne: string;
  winnerHint: string;
  undoRemove: string;
  backToWheel: string;
  shareLink: string;
  shareCopied: string;
  auditLink: string;
  auditEmpty: string;
  auditLine: string;
  auditRow: string;
  countedLine: string;
  sessionLine: string;
  fullscreenLink: string;
  exitFullscreenLink: string;
  exportLink: string;
  exportDone: string;
  settingsLink: string;
  settingsTitle: string;
  soundLabel: string;
  volumeLabel: string;
  durationLabel: string;
  durationValue: string;
  themeLabel: string;
  settingsDone: string;
  advancedSummary: string;
  moreOptionsSummary: string;
  weightsHint: string;
  errorNoEntries: string;
  rangeInvalid: string;
  rangeTooLong: string;
  namesLabel: string;
  teamsCountLabel: string;
  generateTeams: string;
  teamToolAria: string;
  teamError: string;
  teamCountInvalid: string;
  teamCountClamped: string;
  teamsEmptyState: string;
  teamsSummary: string;
  teamHeaderOne: string;
  teamHeaderMany: string;
  copyRoster: string;
  rosterCopied: string;
  teamNamesSample: string;
  contactTopicLabel: string;
  contactNameLabel: string;
  contactEmailLabel: string;
  contactMessageLabel: string;
  contactSend: string;
  contactSending: string;
  contactStatus: string;
  topicQuestion: string;
  topicBug: string;
  topicBusiness: string;
  topicBilling: string;
  errorEmail: string;
  errorMessage: string;
  messageSent: string;
  contactUnavailable: string;
  freeFigure: string;
  freeFigureSub: string;
  openTheWheel: string;
  madeWith: string;
  wheelFigureCaption: string;
  wheelFigureAria: string;
  auditFigureCaption: string;
  auditFigureAria: string;
  presetsTableCaption: string;
  presetsColPreset: string;
  presetsColLoads: string;
  presetsColFor: string;
  planBillingToggle: string;
  planMonthly: string;
  planAnnual: string;
  planMostPopular: string;
  planCtaFree: string;
  planCtaMonthly: string;
  planCtaAnnual: string;
  planSeeYearly: string;
  planTrustLine: string;
  planManageBilling: string;
  cloudSave: string;
  cloudWorking: string;
  cloudSaved: string;
  cloudOffline: string;
  cloudPlusNote: string;
  ideasLink: string;
  ideasWorking: string;
  ideasAdded: string;
  ideasOffline: string;
  ideasNote: string;
  ideasPlusNote: string;
  collectLink: string;
  collectWorking: string;
  collectSaved: string;
  collectOffline: string;
  collectPlusNote: string;
  collectSpinFirst: string;
  plusYearlyCta: string;
  presetHubCrumb: string;
  relatedWheelsTitle: string;
  relatedWheelsAria: string;
  auditRunButton: string;
  auditRunningLabel: string;
  auditResultLine: string;
  auditColEntry: string;
  auditEntriesLabel: string;
  auditTooMany: string;
  auditMoreRows: string;
  sampleWheelLink: string;
  starterListLink: string;
  teamSampleLink: string;
  contactSampleLink: string;
  sampleCredit: string;
  contactSampleCredit: string;
  fairnessTryTitle: string;
  fairnessTryLede: string;
  fairnessTryLink: string;
  teamBandTitle: string;
  teamBandLede: string;
  teamBandLink: string;
  contactBandTitle: string;
  contactBandLede: string;
  auditColObserved: string;
  auditColFair: string;
  auditColGap: string;
};

const en: UiStrings = {
  siteName: "Spin the Wheel",
  skipToContent: "Skip to content",
  previewNotice: "Preview build — not the live site.",
  menuOpen: "Menu",
  menuClose: "Close menu",
  signIn: "Sign in",
  signOut: "Sign out",
  signedInAs: "Signed in as",
  setWheelTitle: "Set wheel title",
  wheelTitleLabel: "Wheel title",
  wheelTitlePlaceholder: "A title shown above the wheel (optional)",
  wheelTitleSave: "Save title",
  wheelTitleRemove: "Remove title",
  stageAriaLabel: "Wheel spinner",
  wheelButtonLabel: "Spin the wheel",
  tapToSpin: "Tap to spin",
  spinning: "Spinning…",
  entriesLabel: "Entries, one per line",
  entriesCountOne: "1 entry on the wheel",
  entriesCountMany: "{n} entries on the wheel",
  presetLabel: "Load preset",
  presetSample: "Starter wheel (8 names)",
  rangeLabel: "Range",
  rangeFrom: "From",
  rangeTo: "To",
  rangeSet: "Set",
  eliminateMode: "Eliminate mode — remove each winner for the next spin",
  removeWinner: "Remove winner",
  removeWinnerElim: "Remove winner (elimination on)",
  spinButton: "Spin the wheel",
  spinHint: "or press Enter",
  winnerLabel: "Winner",
  emptyResult: "The winner lands here.",
  spinAgain: "Spin again",
  countPlusOne: "Count +1",
  winnerHint: "Every spin is a fresh random event — the same winner twice is normal.",
  undoRemove: "Removed {winner} — Undo",
  backToWheel: "Back to the wheel",
  shareLink: "Copy share link",
  shareCopied: "Link copied — it opens this exact wheel",
  auditLink: "Run 10,000 spins",
  auditEmpty: "Add at least one entry to run the audit.",
  auditLine: "{spins} spins — expected {expected} each · {rows}",
  auditRow: "{label} {count} ({share})",
  countedLine: "Counted: {winner} — {tally} of {total} spins tallied",
  sessionLine: "{total} spins this session",
  fullscreenLink: "Fullscreen",
  exitFullscreenLink: "Exit fullscreen",
  exportLink: "Export wheel file",
  exportDone: "Wheel file saved as spin-the-wheel.json",
  settingsLink: "Settings",
  settingsTitle: "Wheel settings",
  soundLabel: "Sound",
  volumeLabel: "Volume",
  durationLabel: "Spin duration",
  durationValue: "{s} s",
  themeLabel: "Colors",
  settingsDone: "Done",
  advancedSummary: "Weights & advanced",
  moreOptionsSummary: "More options",
  weightsHint: 'Add ×N to the end of a line to weight it — "Pizza ×3" is three times as likely. Everything else is evenly matched.',
  errorNoEntries: "Add at least one entry — type one option per line above the Spin button.",
  rangeInvalid: "Set both numbers, from and to.",
  rangeTooLong: "Keep the range within 500 numbers.",
  namesLabel: "Names, one per line",
  teamsCountLabel: "How many teams",
  generateTeams: "Split into teams",
  teamToolAria: "Random team generator",
  teamError: "Add at least one name — paste your list, one name per line.",
  teamCountInvalid: "Set a team count between 2 and 50.",
  teamCountClamped: "{names} names make {teams} teams — empty teams are left out.",
  teamsEmptyState: "Teams appear here after the split.",
  teamsSummary: "{teams} teams · {people} people",
  teamHeaderOne: "Team {n} — 1 name",
  teamHeaderMany: "Team {n} — {m} names",
  copyRoster: "Copy roster",
  rosterCopied: "Roster copied",
  teamNamesSample: "Ava\nBen\nCarlos\nDana\nEli\nFarah\nGrace\nHugo\nImani\nJonas\nKeiko\nLiam",
  contactTopicLabel: "What is this about?",
  contactNameLabel: "Name (optional)",
  contactEmailLabel: "Email",
  contactMessageLabel: "Message",
  contactSend: "Send message",
  contactSending: "Sending…",
  contactStatus: "Message status",
  topicQuestion: "Question",
  topicBug: "A result that looks wrong",
  topicBusiness: "Business",
  topicBilling: "Pricing",
  errorEmail: "Add a valid email so the owner can reply.",
  errorMessage: "Write your message.",
  messageSent: "Message received — you will hear back within two business days.",
  contactUnavailable: "The message could not be delivered yet — the mailbox is not connected. Please try again later.",
  freeFigure: "Free",
  freeFigureSub: "Every tool on this site, at every size of list — no card, no account, no ads.",
  openTheWheel: "Open the wheel",
  madeWith: "Made with",
  wheelFigureCaption: "The starter wheel, exactly as the tool draws it: eight entries, one equal segment each.",
  wheelFigureAria: "The starter wheel drawn as the tool draws it: eight entries, one equal segment each",
  auditFigureCaption: "One recorded run of {spins} spins on the starter wheel: every entry landed within {dev} points of its fair 12.5% share.",
  auditFigureAria: "Bar chart of a recorded 100,000-spin run of the starter wheel: eight entries, each landing within 0.3 points of its fair 12.5 percent share",
  presetsTableCaption: "The preset wheels the Load preset menu holds — each loads ready to spin.",
  presetsColPreset: "Preset",
  presetsColLoads: "Wheel it loads",
  presetsColFor: "Made for",
  planBillingToggle: "Billing period",
  planMonthly: "Monthly",
  planAnnual: "Annual",
  planMostPopular: "Most popular",
  planCtaFree: "Spin the wheel",
  planCtaMonthly: "Get Plus",
  planCtaAnnual: "Get Plus yearly",
  planSeeYearly: "See the yearly price",
  planTrustLine: "Checkout runs on our payment provider over a secure connection. Cancel at any time — billing questions and refunds go through the contact form.",
  planManageBilling: "Manage billing",
  cloudSave: "Save to cloud (Plus)",
  cloudWorking: "Saving…",
  cloudSaved: "Saved to the cloud.",
  cloudOffline: "Could not reach the cloud just now — your wheel stays saved on this device.",
  cloudPlusNote: "Cloud sync is part of Plus — free wheels stay saved on this device.",
  ideasLink: "Get entry ideas (Plus)",
  ideasWorking: "Thinking…",
  ideasAdded: "Ideas added to your list — edit them into your own words.",
  ideasOffline: "Could not reach the AI service just now — try again in a moment.",
  ideasNote: "Entry ideas are a Plus feature, 50 a month; free wheels keep everything else.",
  ideasPlusNote: "Entry ideas are part of Plus (50 a month) — free wheels keep everything else.",
  collectLink: "Collect this result (Plus)",
  collectWorking: "Collecting…",
  collectSaved: "Result collected.",
  collectOffline: "Could not reach the cloud just now — the result stays in the log below.",
  collectPlusNote: "Collecting results is part of Plus — the result stays in the log below.",
  collectSpinFirst: "Spin first, then collect the winner here.",
  plusYearlyCta: "Start with Plus yearly",
  presetHubCrumb: "All preset wheels",
  relatedWheelsTitle: "More preset wheels",
  relatedWheelsAria: "More preset wheels",
  auditRunButton: "Run the 10,000-spin audit",
  auditRunningLabel: "Spinning… {done} of 10,000",
  auditResultLine: "After 10,000 spins the largest gap from the fair share is {dev} points — a fair wheel stays within 2.",
  auditColEntry: "Entry",
  auditColObserved: "Observed",
  auditColFair: "Fair share",
  auditColGap: "Gap",
  auditEntriesLabel: "Entries to audit, one per line",
  auditTooMany: "Keep the audit to 1,000 entries or fewer.",
  auditMoreRows: "+ {n} more entries — the gap reported covers every entry.",
  sampleWheelLink: "Try the starter wheel",
  starterListLink: "Use the starter list",
  teamSampleLink: "Load the sample class",
  contactSampleLink: "Fill with a sample note",
  sampleCredit: "Sample list: the Spin the Wheel starter set — our own list, reuse it freely.",
  contactSampleCredit: "Sample note written by us for this demo — nothing is sent until you press Send.",
  fairnessTryTitle: "Don’t take our word for it — run the audit",
  fairnessTryLede: "This spins a wheel 10,000 times in your browser and counts every landing. The starter list is preloaded; paste your own entries to audit your wheel, not ours.",
  fairnessTryLink: "Read the full fairness page",
  teamBandTitle: "Split names into teams",
  teamBandLede: "Paste a class or club list and split it fairly — every name is used exactly once.",
  teamBandLink: "Open the full team generator",
  contactBandTitle: "Questions? Send a note",
  contactBandLede: "Tell us what to fix or add — messages reach us directly.",
};

const dictionaries: Record<string, UiStrings> = { en };

export function uiStringsFor(language?: string): UiStrings {
  return dictionaries[language ?? "en"] ?? en;
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** The approved hero sentence is one lede above the tool and, when it runs
 *  longer than one sentence, its remainder moves below the tool's stage —
 *  both verbatim, at the first sentence boundary. */
export function splitLede(text: string): [string, string] {
  const match = text.match(/^(.+?[.!?])\s+(?=[A-Z])/);
  if (match && match[1].length >= 40) return [match[1], text.slice(match[1].length + 1)];
  return [text, ""];
}
