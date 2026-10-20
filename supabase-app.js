(function () {
  'use strict';
  const config = window.SUPABASE_CONFIG;
  if (!config || !window.supabase) {
    console.error('TeslaInvestorHub: Supabase configuration is missing.');
    return;
  }
  const db = window.supabase.createClient(config.url, config.publishableKey);
  let currentUser = null;
  const $ = id => document.getElementById(id);

  function modalStyles() {
    if ($('tih-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'tih-auth-styles';
    style.textContent = '.tih-modal-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.74);display:flex;align-items:center;justify-content:center;padding:16px}.tih-modal{width:100%;max-width:440px;max-height:90vh;overflow:auto;background:var(--card,#fff);color:var(--text,#111);border:1px solid var(--line,#ddd);border-radius:16px;padding:24px;box-shadow:0 18px 70px rgba(0,0,0,.35)}.tih-modal h2{margin:0 0 8px;letter-spacing:-.035em}.tih-modal p{color:var(--muted,#666)}.tih-modal label{display:block;font-size:12px;font-weight:800;margin:12px 0 5px}.tih-modal input{display:block;box-sizing:border-box;width:100%;padding:12px;margin:0;border:1px solid var(--line,#ccc);border-radius:8px;font-size:16px;background:var(--card,#fff);color:var(--text,#111)}.tih-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.tih-modal button{padding:11px 13px;border:1px solid var(--line,#ddd);border-radius:8px;background:var(--card,#fff);color:var(--text,#111);font-weight:800;cursor:pointer}.tih-modal button.tih-primary{background:#d71920;border-color:#d71920;color:#fff}.tih-modal button:disabled{opacity:.55}.tih-status{padding:10px;border-radius:8px;background:rgba(127,127,127,.1);overflow-wrap:anywhere}.tih-message{padding:12px;border:1px solid var(--line,#ddd);border-radius:9px;margin:9px 0;overflow-wrap:anywhere}.tih-message small{display:block;opacity:.72;margin:5px 0;font-size:11px}';
    document.head.appendChild(style);
  }

  function showAuthModal(initialMode) {
    modalStyles();
    const old = $('tih-auth-backdrop');
    if (old) old.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'tih-auth-backdrop';
    backdrop.className = 'tih-modal-backdrop';
    backdrop.innerHTML = '<section class="tih-modal" role="dialog" aria-modal="true" aria-labelledby="tih-auth-heading"><h2 id="tih-auth-heading">Welcome back</h2><p id="tih-auth-intro">Sign in or create your member account.</p><form id="tih-auth-form"><div id="tih-name-wrap"><label for="tih-name">Display name</label><input id="tih-name" type="text" autocomplete="name" maxlength="80" placeholder="Your name"></div><label for="tih-email">Email address</label><input id="tih-email" type="email" autocomplete="email" required placeholder="you@example.com"><div id="tih-password-wrap"><label for="tih-password">Password</label><input id="tih-password" type="password" autocomplete="current-password" minlength="6" placeholder="At least 6 characters"></div><div class="tih-modal-actions"><button class="tih-primary" type="submit" id="tih-submit">Sign in</button><button type="button" id="tih-switch">Create account</button><button type="button" id="tih-forgot">Forgot password?</button><button type="button" id="tih-close">Close</button></div></form><p class="tih-status" id="tih-auth-status" role="status" aria-live="polite"></p></section>';
    document.body.appendChild(backdrop);
    const heading = $('tih-auth-heading'), intro = $('tih-auth-intro'), nameWrap = $('tih-name-wrap'), passwordWrap = $('tih-password-wrap');
    const name = $('tih-name'), email = $('tih-email'), password = $('tih-password'), submit = $('tih-submit'), switchBtn = $('tih-switch'), forgotBtn = $('tih-forgot'), status = $('tih-auth-status');
    let mode = initialMode || 'signin';

    function setMode(next) {
      mode = next;
      status.textContent = '';
      const isSignup = mode === 'signup';
      const isRecovery = mode === 'recovery';
      const isNewPassword = mode === 'newpassword';
      heading.textContent = isSignup ? 'Create your account' : isRecovery ? 'Reset your password' : isNewPassword ? 'Choose a new password' : 'Welcome back';
      intro.textContent = isRecovery ? 'We will email you a secure password-reset link.' : isNewPassword ? 'Choose a new password for your account.' : 'Sign in or create your member account.';
      nameWrap.style.display = isSignup ? 'block' : 'none';
      passwordWrap.style.display = (isRecovery ? 'none' : 'block');
      password.required = !isRecovery;
      password.autocomplete = (isSignup || isNewPassword) ? 'new-password' : 'current-password';
      submit.textContent = isSignup ? 'Create account' : isRecovery ? 'Send reset link' : isNewPassword ? 'Save new password' : 'Sign in';
      switchBtn.style.display = (isRecovery || isNewPassword) ? 'none' : 'inline-flex';
      switchBtn.textContent = isSignup ? 'I already have an account' : 'Create account';
      forgotBtn.style.display = (isRecovery || isNewPassword || isSignup) ? 'none' : 'inline-flex';
      if (isNewPassword) { nameWrap.style.display = 'none'; email.disabled = true; }
      else email.disabled = false;
      if (!isNewPassword && mode !== 'recovery') password.value = '';
    }

    switchBtn.addEventListener('click', () => setMode(mode === 'signup' ? 'signin' : 'signup'));
    forgotBtn.addEventListener('click', () => setMode('recovery'));
    $('tih-close').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.remove(); });
    document.addEventListener('keydown', function escapeModal(event) { if (event.key === 'Escape' && $('tih-auth-backdrop') === backdrop) { backdrop.remove(); document.removeEventListener('keydown', escapeModal); } });

    $('tih-auth-form').addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'Please wait…';
      try {
        const emailValue = email.value.trim();
        const passwordValue = password.value;
        if (mode === 'signup') {
          const result = await db.auth.signUp({ email: emailValue, password: passwordValue, options: { data: { display_name: name.value.trim() || emailValue.split('@')[0] }, emailRedirectTo: window.location.origin + window.location.pathname } });
          if (result.error) throw result.error;
          if (result.data.session) {
            currentUser = result.data.user;
            status.textContent = 'Account created and signed in.';
            await loadProfile(); await loadMessages();
          } else {
            status.textContent = 'Registration started. Check your inbox to confirm your email, then sign in.';
          }
        } else if (mode === 'recovery') {
          const result = await db.auth.resetPasswordForEmail(emailValue, { redirectTo: window.location.origin + window.location.pathname });
          if (result.error) throw result.error;
          status.textContent = 'If this email belongs to an account, Supabase will send a password-reset link. Check your inbox and spam folder.';
        } else if (mode === 'newpassword') {
          const result = await db.auth.updateUser({ password: passwordValue });
          if (result.error) throw result.error;
          status.textContent = 'Password updated successfully. You are signed in.';
          currentUser = result.data.user || currentUser;
          await loadProfile(); await loadMessages();
          setTimeout(() => { if (backdrop.isConnected) backdrop.remove(); }, 1200);
        } else {
          const result = await db.auth.signInWithPassword({ email: emailValue, password: passwordValue });
          if (result.error) throw result.error;
          currentUser = result.data.user;
          status.textContent = 'Signed in successfully.';
          await loadProfile(); await loadMessages();
          setTimeout(() => { if (backdrop.isConnected) backdrop.remove(); }, 800);
        }
      } catch (error) {
        status.textContent = error && error.message ? error.message : 'Could not complete the request. Please try again.';
      } finally { submit.disabled = false; }
    });
    setMode(mode);
    email.focus();
  }

  async function loadProfile() {
    if (!currentUser) return;
    const displayName = currentUser.user_metadata && currentUser.user_metadata.display_name || currentUser.email && currentUser.email.split('@')[0] || 'Member';
    const found = await db.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (found.error) { console.error('Profile load:', found.error.message); }
    else if (!found.data) {
      const inserted = await db.from('profiles').insert({ id: currentUser.id, display_name: displayName });
      if (inserted.error) console.error('Profile create:', inserted.error.message);
    }
    const status = $('tih-account-status');
    if (status) status.textContent = 'Signed in as ' + (currentUser.email || displayName);
    if ($('tihSignOut')) $('tihSignOut').disabled = false;
  }

  async function loadMessages() {
    const feed = $('feed');
    if (!feed) return;
    if (!currentUser) { feed.textContent = 'Sign in to read and join the member conversation.'; return; }
    const result = await db.from('community_messages').select('*').order('created_at', { ascending: false }).limit(50);
    if (result.error) { feed.textContent = 'Community feed unavailable. Check database tables and access policies.'; console.error('Messages:', result.error.message); return; }
    if (!result.data || !result.data.length) { feed.textContent = 'No community messages yet. Be the first to post!'; return; }
    feed.replaceChildren();
    result.data.slice().reverse().forEach(message => {
      const article = document.createElement('article'); article.className = 'tih-message';
      const title = document.createElement('strong'); title.textContent = message.display_name || 'Member';
      const body = document.createElement('p'); body.textContent = message.message || '';
      const meta = document.createElement('small'); meta.textContent = message.created_at ? new Date(message.created_at).toLocaleString() : 'Community member';
      article.append(title, body, meta); feed.append(article);
    });
  }

  function setupCommunityForm() {
    const form = $('postForm'); if (!form || form.dataset.tihReady) return; form.dataset.tihReady = 'yes';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!currentUser) { showAuthModal('signin'); return; }
      const input = $('postBody'), message = input ? input.value.trim() : '';
      if (!message) return;
      const displayName = currentUser.user_metadata && currentUser.user_metadata.display_name || currentUser.email && currentUser.email.split('@')[0] || 'Member';
      const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
      try {
        const result = await db.from('community_messages').insert({ user_id: currentUser.id, display_name: displayName, message });
        if (result.error) throw result.error;
        form.reset(); await loadMessages();
      } catch (error) { alert('Could not publish your message: ' + (error.message || 'please try again.')); }
      finally { if (button) button.disabled = false; }
    });
  }

  function setupAccountButtons() {
    ['signIn', 'signInAgain'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', event => { event.preventDefault(); showAuthModal('signin'); }); });
    const reset = $('tihPasswordReset'); if (reset) reset.addEventListener('click', () => showAuthModal('recovery'));
    const signout = $('tihSignOut');
    if (signout) { signout.disabled = true; signout.addEventListener('click', async () => { signout.disabled = true; const result = await db.auth.signOut(); if (result.error) { alert('Could not sign out: ' + result.error.message); signout.disabled = false; return; } currentUser = null; const status = $('tih-account-status'); if (status) status.textContent = 'You are signed out.'; await loadMessages(); }); }
    const top = $('signIn'); if (top) top.textContent = currentUser ? 'Account' : 'Sign in / Join';
  }

  async function start() {
    modalStyles(); setupAccountButtons(); setupCommunityForm();
    const session = await db.auth.getSession();
    if (session.error) console.error('Session:', session.error.message);
    currentUser = session.data && session.data.session && session.data.session.user || null;
    if (currentUser) await loadProfile();
    await loadMessages();
    db.auth.onAuthStateChange((event, sessionInfo) => {
      currentUser = sessionInfo && sessionInfo.user || null;
      const top = $('signIn'); if (top) top.textContent = currentUser ? 'My account' : 'Sign in / Join';
      setTimeout(async () => {
        if (currentUser) await loadProfile();
        else { const status = $('tih-account-status'); if (status) status.textContent = 'Not signed in yet'; if ($('tihSignOut')) $('tihSignOut').disabled = true; }
        await loadMessages();
      }, 0);
      if (event === 'PASSWORD_RECOVERY') setTimeout(() => showAuthModal('newpassword'), 100);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
