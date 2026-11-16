// Clears user identity from localStorage and redirects to the Auth0 logout endpoint,
// using the domain that was used to log in when the login happened in the browser.
(function () {
  const config = JSON.parse(document.getElementById("logout-config").textContent);
  const loginDomain = localStorage.getItem("auth0_login_domain");
  localStorage.removeItem("auth0_user_id");
  localStorage.removeItem("auth0_login_domain");

  let logoutUrl = config.auth0LogoutUrl;
  if (loginDomain) {
    const url = new URL(logoutUrl);
    url.hostname = loginDomain;
    logoutUrl = url.toString();
  }

  window.location.replace(logoutUrl);
})();
