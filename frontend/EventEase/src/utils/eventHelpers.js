export function organizerNameFromEmail(email) {
  if (!email || typeof email !== "string") return "Organizator";
  const at = email.indexOf("@");
  if (at === -1) return email;
  const name = email.slice(0, at).trim();
  return name.length > 0 ? name : "Organizator";
}

export function isValidVoteStatus(status) {
  return status === "yes" || status === "no" || status === "if_need_be";
}

export function buildSharePath(shareToken) {
  return `/invite/${shareToken}`;
}
