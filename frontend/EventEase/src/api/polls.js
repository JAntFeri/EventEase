// Tanek ovoj okoli fetch za vse klice /api/polls. Neuspešen HTTP odgovor vrže ApiError,
// omrežna napaka pa pride naprej kot izjema iz fetch (npr. TypeError).
export class ApiError extends Error {
  constructor(status) {
    super(`Strežnik je vrnil napako ${status}.`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, body) {
  const init =
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const response = await fetch(path, init);
  if (!response.ok) throw new ApiError(response.status);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const enc = encodeURIComponent;

export const getSharedPoll = (shareToken) => request(`/api/polls/share/${enc(shareToken)}`);

export const getAdminPoll = (adminToken) => request(`/api/polls/admin/${enc(adminToken)}`);

export const createPoll = (poll) => request("/api/polls", poll);

export const shareByEmail = (payload) => request("/api/polls/share-email", payload);

export const submitVote = (shareToken, vote) =>
  request(`/api/polls/share/${enc(shareToken)}/vote`, vote);

export const suggestDates = (shareToken, suggestion) =>
  request(`/api/polls/share/${enc(shareToken)}/suggest`, suggestion);

export const acceptSuggestion = (adminToken, suggestionId) =>
  request(`/api/polls/admin/${enc(adminToken)}/accept-suggestion`, { suggestion_id: suggestionId });

export const finalizePoll = (adminToken, slotId) =>
  request(`/api/polls/admin/${enc(adminToken)}/finalize`, { final_slot_id: slotId });
