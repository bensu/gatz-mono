import PropTypes from "prop-types";
import dayjs from "dayjs";

import * as T from "../gatz/types";

export const StylePropType = PropTypes.oneOfType([
  PropTypes.array,
  PropTypes.object,
  PropTypes.number,
  PropTypes.bool,
]);

export function isSameDayJs(a: dayjs.Dayjs, b: dayjs.Dayjs): boolean {
  return a.isSame(b, "day");
}

export function isSameDay(
  currentMessage: T.Message,
  diffMessage: T.Message | null | undefined,
) {
  if (!diffMessage || !diffMessage.created_at) {
    return false;
  }

  const currentCreatedAt = dayjs(currentMessage.created_at);
  const diffCreatedAt = dayjs(diffMessage.created_at);

  if (!currentCreatedAt.isValid() || !diffCreatedAt.isValid()) {
    return false;
  }

  return currentCreatedAt.isSame(diffCreatedAt, "day");
}

export function isSameUser(
  currentMessage: T.Message,
  diffMessage: T.Message | null | undefined,
) {
  return Boolean(
    diffMessage &&
    diffMessage.user_id &&
    currentMessage.user_id &&
    diffMessage.user_id === currentMessage.user_id
  );
}
