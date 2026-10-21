export function organizerNameFromEmail(email) {
  if (!email || typeof email !== "string") return "Organizator";
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  const name = (at === -1 ? trimmed : trimmed.slice(0, at)).trim();
  return name.length > 0 ? name : "Organizator";
}

export function isValidVoteStatus(status) {
  return status === "yes" || status === "no" || status === "if_need_be";
}

export function buildSharePath(shareToken) {
  if (typeof shareToken !== "string" || shareToken.trim() === "") {
    throw new TypeError("buildSharePath: manjka žeton za deljenje.");
  }
  return `/invite/${encodeURIComponent(shareToken)}`;
}
