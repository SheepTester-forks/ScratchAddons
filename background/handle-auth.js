(async function () {
  await checkSession();
  scratchAddons.localState.ready.auth = true;
})();

async function checkSession() {
  let json = {};
  const scratchLang = navigator.language;
  const csrfToken = null;
  scratchAddons.globalState.auth = {
    isLoggedIn: Boolean(json.user),
    username: json.user ? json.user.username : null,
    userId: json.user ? json.user.id : null,
    xToken: json.user ? json.user.token : null,
    csrfToken,
    scratchLang,
  };
}
