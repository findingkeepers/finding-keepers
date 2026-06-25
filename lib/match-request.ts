export type MatchRequestRecord = {
  male_short_id: string;
  female_short_id: string;
  requested_by_short_id?: string | null;
};

export function getMatchDirection(request: MatchRequestRecord) {
  const requester = request.requested_by_short_id?.trim();

  if (requester) {
    const target =
      requester === request.male_short_id
        ? request.female_short_id
        : request.male_short_id;

    return {
      fromId: requester,
      toId: target,
    };
  }

  return {
    fromId: request.male_short_id,
    toId: request.female_short_id,
  };
}

export function formatMatchDirection(request: MatchRequestRecord) {
  const { fromId, toId } = getMatchDirection(request);
  return `${fromId} → ${toId}`;
}

export function formatUserMatchDirection(
  request: MatchRequestRecord,
  myShortId: string
) {
  const { fromId, toId } = getMatchDirection(request);

  if (fromId === myShortId || toId === myShortId) {
    return `${fromId} → ${toId}`;
  }

  const otherId =
    request.male_short_id === myShortId
      ? request.female_short_id
      : request.male_short_id;

  return `${myShortId} → ${otherId}`;
}