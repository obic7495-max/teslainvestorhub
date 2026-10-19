(function () {
  'use strict';

  const config = window.TIH_SUPABASE_CONFIG;

  if (!config || !window.supabase) {
    console.error('Supabase configuration is missing.');
    return;
  }

  const db = window.supabase.createClient(
    config.url,
    config.publishableKey
  );

  let currentUser = null;

  function safe(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }

  function showMessage(message) {
    alert(message);
  }

  async function getUser() {
    const { data, error } = await db.auth.getUser();

    if (error) {
      currentUser = null;
      return null;
    }

    currentUser = data.user;
    return currentUser;
  }

  function addStyles() {
    if (document.getElementById('tih-online-styles')) return;

    const style = document.createElement('style');
    style.id = 'tih-online-styles';

    style.textContent = `
      .tih-panel {
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px;
        margin: 12px 0;
      }
      .tih-panel input, .tih-panel textarea {
        display: block;
        box-sizing: border-box;
        width: 100%;
        padding: 12px;
        margin: 8px 0;
        border: 1px solid var(--line);
        border-radius
