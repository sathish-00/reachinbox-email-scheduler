import session from "express-session";
import { redisConnection } from "./redis";

const SESSION_TTL_SECONDS = 24 * 60 * 60;

class RedisSessionStore extends session.Store {
  private getKey(sessionId: string): string {
    return `express-session:${sessionId}`;
  }

  get(
    sessionId: string,
    callback: (
      err: any,
      session?: session.SessionData | null
    ) => void
  ): void {
    void redisConnection
      .get(this.getKey(sessionId))
      .then((value) => {
        if (!value) {
          callback(null, null);
          return;
        }

        try {
          const sessionData =
            JSON.parse(value) as session.SessionData;

          callback(null, sessionData);
        } catch (error) {
          callback(error);
        }
      })
      .catch((error) => {
        callback(error);
      });
  }

  set(
    sessionId: string,
    sessionData: session.SessionData,
    callback?: (err?: any) => void
  ): void {
    void redisConnection
      .set(
        this.getKey(sessionId),
        JSON.stringify(sessionData),
        "EX",
        SESSION_TTL_SECONDS
      )
      .then(() => {
        callback?.();
      })
      .catch((error) => {
        callback?.(error);
      });
  }

  destroy(
    sessionId: string,
    callback?: (err?: any) => void
  ): void {
    void redisConnection
      .del(this.getKey(sessionId))
      .then(() => {
        callback?.();
      })
      .catch((error) => {
        callback?.(error);
      });
  }

  touch(
    sessionId: string,
    _sessionData: session.SessionData,
    callback?: () => void
  ): void {
    void redisConnection
      .expire(
        this.getKey(sessionId),
        SESSION_TTL_SECONDS
      )
      .then(() => {
        callback?.();
      })
      .catch(() => {
        callback?.();
      });
  }
}

export const redisSessionStore =
  new RedisSessionStore();