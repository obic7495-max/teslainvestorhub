(function () {
  'use strict';

  const config = window.SUPABASE_CONFIG;

  if (!config || !window.supabase) {
    console.error('Supabase configuration is missing.');
    return;
  }

  const db = window.supabase.createClient(
    config.url,
    config.publishableKey
  );

  let currentUser = null;

  function get(id) {
    return document.getElementById(id);
  }

  function addStyles() {
    if (get('tih-auth-styles')) return;

    const style = document.createElement('style');
    style.id = 'tih-auth-styles';
    style.textContent = `
      .tih-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(0,0,0,.72);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .tih-modal {
        width: 100%;
        max-width: 420px;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--card, #fff);
        color: var(--text, #111);
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 15px 60px rgba(0,0,0,.3);
      }
      .tih-modal input {
        display: block;
        box-sizing: border-box;
        width: 100%;
        padding: 13px;
        margin: 10px 0;
        border: 1px solid #aaa;
        border-radius: 9px;
        font-size: 16px;
      }
      .tih-modal button {
        padding: 12px 16px;
        margin: 5px 4px 5px 0;
        border: 0;
        border-radius: 9px;
        cursor: pointer;
      }
      .tih-primary {
        background: #2563eb;
        color: white;
      }
      .tih-status {
        margin-top: 12px;
        overflow-wrap: anywhere;
      }
      .tih-message {
        padding: 12px;
        margin: 10px 0;
        border-radius: 10px;
        background: rgba(128,128,128,.12);
        overflow-wrap: anywhere;
      }
      .tih-message small {
        display: block;
        opacity: .7;
        margin-bottom: 5px;
      }
    `;
    document.head.appendChild(style);
  }

  function showAuthModal() {
    addStyles();

    const old = get('tih-auth-backdrop');
    if (old) old.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'tih-auth-backdrop';
    backdrop.className = 'tih-modal-backdrop';

    backdrop.innerHTML = `
      <section class="tih-modal">
        <h2 id="tih-auth-heading">Welcome to TeslaInvestorHub</h2>
        <p>Sign in or create your account.</p>

        <form id="tih-auth-form">
          <input id="tih-name" type="text"
            placeholder="Your name (for new accounts)"
            autocomplete="name">
          <input id="tih-email" type="email"
            placeholder="Email address"
            autocomplete="email" required>
          <input id="tih-password" type="password"
            placeholder="Password (at least 6 characters)"
            autocomplete="current-password"
            minlength="6" required>

          <button class="tih-primary" type="submit" id="tih-submit">
            Sign in
          </button>
          <button type="button" id="tih-switch">
            Create an account
          </button>
          <button type="button" id="tih-close">Close</button>
        </form>

        <p class="tih-status" id="tih-auth-status" role="status"></p>
      </section>
    `;

    document.body.appendChild(backdrop);

    let creatingAccount = false;

    const heading = get('tih-auth-heading');
    const submit = get('tih-submit');
    const switchButton = get('tih-switch');
    const password = get('tih-password');
    const name = get('tih-name');
    const status = get('tih-auth-status');

    function updateMode() {
      heading.textContent = creatingAccount
        ? 'Create your account'
        : 'Welcome back';
      submit.textContent = creatingAccount
        ? 'Sign up'
        : 'Sign in';
      switchButton.textContent = creatingAccount
        ? 'I already have an account'
        : 'Create an account';
      name.style.display = creatingAccount ? 'block' : 'none';
      password.autocomplete = creatingAccount
        ? 'new-password'
        : 'current-password';
      status.textContent = '';
    }

    switchButton.addEventListener('click', function () {
      creatingAccount = !creatingAccount;
      updateMode();
    });

    get('tih-close').addEventListener('click', function () {
      backdrop.remove();
    });

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) backdrop.remove();
    });

    get('tih-auth-form').addEventListener('submit', async function (event) {
      event.preventDefault();

      const email = get('tih-email').value.trim();
      const passwordValue = password.value;
      const displayName = name.value.trim();

      submit.disabled = true;
      status.textContent = 'Please wait...';

      try {
        if (creatingAccount) {
          const result = await db.auth.signUp({
            email: email,
            password: passwordValue,
            options: {
              data: {
                display_name: displayName || email.split('@')[0]
              }
            }
          });

          if (result.error) throw result.error;

          if (result.data.session) {
            status.textContent = 'Account created successfully!';
          } else {
            status.textContent =
              'Account request received. Check your email to confirm your account, then sign in.';
          }
        } else {
          const result = await db.auth.signInWithPassword({
            email: email,
            password: passwordValue
          });

          if (result.error) throw result.error;

          status.textContent = 'Signed in successfully!';
          await loadProfile();
          await loadMessages();
          setTimeout(function () {
            backdrop.remove();
          }, 1000);
        }
      } catch (error) {
        status.textContent = error.message || 'Something went wrong.';
      } finally {
        submit.disabled = false;
      }
    });

    updateMode();
  }

  async function loadProfile() {
    if (!currentUser) return;

    const name =
      currentUser.user_metadata?.display_name ||
      currentUser.email?.split('@')[0] ||
      'Member';

    const result = await db
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (result.error) {
      console.error('Profile loading error:', result.error.message);
      return;
    }

    const profile = result.data;

    if (!profile) {
      const inserted = await db.from('profiles').insert({
        id: currentUser.id,
        display_name: name
      });

      if (inserted.error) {
        console.error('Profile creation error:', inserted.error.message);
      }
    }

    const status = get('tih-account-status');
    if (status) {
      status.textContent = 'Signed in as ' + currentUser.email;
    }
  }

  async function loadMessages() {
    const feed = get('feed');
    if (!feed) return;

    const result = await db
      .from('community_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (result.error) {
      console.error('Message loading error:', result.error.message);
      return;
    }

    if (!result.data || result.data.length === 0) {
      feed.innerHTML = '<p>No community messages yet. Be the first to post!</p>';
      return;
    }

    feed.replaceChildren();

    result.data.reverse().forEach(function (message) {
      const article = document.createElement('article');
      article.className = 'tih-message';

      const title = document.createElement('strong');
      title.textContent = message.title || 'Community message';

      const body = document.createElement('p');
      body.textContent = message.body || message.content || '';

      const meta = document.createElement('small');
      meta.textContent = message.created_at
        ? new Date(message.created_at).toLocaleString()
        : 'Community member';

      article.appendChild(title);
      article.appendChild(body);
      article.appendChild(meta);
      feed.appendChild(article);
    });
  }

  function setupCommunityForm() {
    const form = get('postForm');
    if (!form || form.dataset.tihReady) return;

    form.dataset.tihReady = 'true';

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (!currentUser) {
        showAuthModal();
        return;
      }

      const titleInput = get('postTitle');
      const bodyInput = get('postBody');

      const title = titleInput ? titleInput.value.trim() : '';
      const body = bodyInput ? bodyInput.value.trim() : '';

      if (!body) {
        alert('Please write a message first.');
        return;
      }

      const result = await db.from('community_messages').insert({
        user_id: currentUser.id,
        title: title || 'Community message',
        body: body
      });

      if (result.error) {
        alert('Could not publish your message: ' + result.error.message);
        return;
      }

      form.reset();
      await loadMessages();
    });
  }

  function setupAccountButton() {
    const button = get('signIn');
    if (!button) return;

    button.onclick = function (event) {
      event.preventDefault();
      showAuthModal();
    };
  }

  async function start() {
    addStyles();
    setupAccountButton();
    setupCommunityForm();

    const result = await db.auth.getSession();

    if (result.error) {
      console.error('Session error:', result.error.message);
    }

    currentUser = result.data?.session?.user || null;

    if (currentUser) {
      await loadProfile();
    }

    await loadMessages();

    db.auth.onAuthStateChange(function (_event, session) {
      currentUser = session?.user || null;

      if (currentUser) {
        setTimeout(async function () {
          await loadProfile();
          await loadMessages();
        }, 0);
      }
    });

    setInterval(function () {
      loadMessages();
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();