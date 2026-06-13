/**
 * Official document cookie handlers for managing persistent user preferences,
 * secure sessions, and dark/light configuration state.
 */

export function setCookie(name: string, value: string, daysActive = 7) {
  const date = new Date();
  date.setTime(date.getTime() + daysActive * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  
  // Set the cookie with safe visual settings, secure parameters, and sameSite properties
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

export function eraseCookie(name: string) {
  document.cookie = `${name}=; Max-Age=-99999999; path=/;SameSite=Lax`;
}
