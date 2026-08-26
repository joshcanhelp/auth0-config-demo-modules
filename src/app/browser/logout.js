// Clears user identity from localStorage and redirects to the Auth0 logout endpoint.
(function () {
  const config = JSON.parse(document.getElementById("logout-config").textContent);
  localStorage.removeItem("auth0_user_id");
  window.location.replace(config.auth0LogoutUrl);
})();
