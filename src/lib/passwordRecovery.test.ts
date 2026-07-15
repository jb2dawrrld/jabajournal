import { describe, expect, it, beforeEach } from "vitest";
import {
  PASSWORD_RECOVERY_FLAG_KEY,
  capturePasswordRecoveryIntentFromUrl,
  clearPasswordRecoveryIntent,
  hasPasswordRecoveryIntent,
  markPasswordRecoveryIntent,
} from "./passwordRecovery";

describe("passwordRecovery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.location.hash = "";
  });

  it("stores and clears the recovery flag", () => {
    expect(hasPasswordRecoveryIntent()).toBe(false);
    markPasswordRecoveryIntent();
    expect(hasPasswordRecoveryIntent()).toBe(true);
    expect(sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY)).toBe("1");
    clearPasswordRecoveryIntent();
    expect(hasPasswordRecoveryIntent()).toBe(false);
  });

  it("captures intent from the URL hash", () => {
    window.location.hash = "#type=recovery&access_token=x";
    expect(capturePasswordRecoveryIntentFromUrl()).toBe(true);
    expect(hasPasswordRecoveryIntent()).toBe(true);
  });
});
