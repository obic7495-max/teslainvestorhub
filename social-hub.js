(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const config = window.SUPABASE_CONFIG;
  const state = {
    db: null, user: null, profile: null, authMode: 'signin', activePage: 'home',
    feedFilter: 'for-you', exploreSort: 'latest', search: '', posts: [], postOffset: 0,
    activeConversation: null, activeSymbol: 'NASDAQ:TSLA', newsKey: 'tesla', newsCache: {},
    galleryLoaded: false, storyItems: [], selectedPostFile: null, nextPostOffset: 0,
    schemaMissing: false
  };
  const TOPICS = {
    tesla:{label:'Tesla & TSLA stock',q:'Tesla TSLA stock earnings deliveries margins'},
    bitcoin:{label:'Bitcoin & crypto',q:'Bitcoin cryptocurrency Ethereum crypto markets'},
    elon:{label:'Elon Musk',q:'Elon Musk latest news'},
    spacex:{label:'SpaceX & Starlink',q:'SpaceX Starlink rocket launches'},
    xai:{label:'xAI & artificial intelligence',q:'xAI Grok artificial intelligence AI'},
    neuralink:{label:'Neuralink',q:'Neuralink brain computer interface'},
    ev:{label:'Electric vehicles & batteries',q:'electric vehicles EV batteries charging industry'},
    robotaxi:{label:'Robotaxi & Optimus',q:'Tesla robotaxi Cybercab Optimus robot autonomous driving'},
    vehicles:{label:'Tesla models & Cybertruck',q:'Tesla Model 3 Model Y Model S Model X Cybertruck'},
    markets:{label:'Global stock markets',q:'global stock markets Nasdaq S&P 500 FTSE Nikkei'},
    commodities:{label:'Gold, oil & forex',q:'gold silver oil forex US dollar USD NGN'},
    safety:{label:'Recalls & safety',q:'Tesla vehicle recall safety investigation NHTSA'}
  };
  const SYMBOLS = {
    'NASDAQ:TSLA':'Tesla, Inc. · TSLA','NASDAQ:NVDA':'NVIDIA · NVDA','NASDAQ:AAPL':'Apple · AAPL',
    'SP:SPX':'S&P 500','NASDAQ:NDX':'Nasdaq 100','BINANCE:BTCUSDT':'Bitcoin / Tether',
    'BINANCE:ETHUSDT':'Ethereum / Tether','FX:EURUSD':'Euro / US Dollar','FX:GBPUSD':'British Pound / US Dollar',
    'FX_IDC:USDNGN':'US Dollar / Nigerian Naira','OANDA:XAUUSD':'Gold / US Dollar','OANDA:XAGUSD':'Silver / US Dollar','TVC:USOIL':'WTI Crude Oil'
  };
  const PAGE_NAMES = {home:'Your feed',explore:'Explore',vehicles:'Vehicles & orders',markets:'Live markets',news:'News & insights',community:'Community chat',messages:'Messages',saved:'Saved posts',notifications:'Notifications',profile:'My profile',learn:'Learning centre'};
  const safeUrl = raw => { try { const u = new URL(String(raw || ''), location.href); return ['https:','http:'].includes(u.protocol) ? u.href : null; } catch (_) { return null; } };
  const plainDate = raw => { if (!raw) return 'just now'; const d = new Date(raw); return Number.isNaN(d.getTime()) ? 'recently' : d.toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); };
  const initials = name => (String(name || 'Member').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'M');
  const showToast = message => { const box=$('toastStack'); if(!box) return; const item=document.createElement('div'); item.className='toast'; item.textContent=message; box.append(item); setTimeout(()=>item.remove(),4200); };
  const setStatus = (id,message) => { const el=$(id); if(el) el.textContent=message; };
  const showAlert = (id,message,kind='warn') => { const el=$(id); if(!el) return; el.className='alert'+(kind==='error'?' error':kind==='warn'?' warn':''); el.textContent=message; el.classList.remove('hidden'); };
  const hide = el => { if(el) el.classList.add('hidden'); };
  const visible = el => { if(el) el.classList.remove('hidden'); };
  function avatarNode(person, sizeClass='avatar') {
    const wrap=document.createElement('span'); wrap.className=sizeClass; wrap.textContent=initials(person && (person.display_name || person.handle));
    if(person && person.avatar_url && safeUrl(person.avatar_url)) {
      const img=document.createElement('img'); img.src=person.avatar_url; img.alt=''; img.loading='lazy';
      img.addEventListener('error',()=>img.remove(),{once:true}); wrap.replaceChildren(img);
    }
    return wrap;
  }
  function requireAuth(message='Sign in or create a free account to use this feature.') {
    if(state.user) return true;
    showToast(message); openAuth('signin'); return false;
  }
  function setBusy(button,busy,label) { if(!button) return; if(busy){button.dataset.oldText=button.textContent;button.disabled=true;button.textContent=label||'Please wait…';}else{button.disabled=false;if(button.dataset.oldText){button.textContent=button.dataset.oldText;delete button.dataset.oldText;}} }

  function go(page) {
    if (!$('page-'+page)) return;
    state.activePage=page;
    $$('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
    $$('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    if($('topbarTitle')) $('topbarTitle').textContent=PAGE_NAMES[page]||page;
    try { history.replaceState(null,'','#'+page); } catch(_) {}
    if(page==='vehicles'&&!state.galleryLoaded) loadTeslaGallery();
    if(page==='markets') loadMarketChart(state.activeSymbol);
    if(page==='news') loadNews(state.newsKey,true);
    if(page==='community') loadCommunityChat();
    if(page==='messages') loadConversations();
    if(page==='saved') loadSavedPosts();
    if(page==='notifications') loadNotifications();
    if(page==='profile') loadProfileForm();
    if(page==='explore') loadExplore();
    window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  $$('[data-page]').forEach(button=>button.addEventListener('click',event=>{const p=button.dataset.page;if(p) go(p);}));
  $('mobileCreate')?.addEventListener('click',()=>{go('home');if(!requireAuth())return;$('socialPostBody')?.focus();window.scrollTo({top:0,behavior:'smooth'});});
  $('sidebarJoin')?.addEventListener('click',()=>openAuth('signup'));
  $('chatJoinButton')?.addEventListener('click',()=>{if(requireAuth('Sign in to join the conversation.'))$('postBody')?.focus();});
  $('globalSearch')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const q=event.currentTarget.value.trim();go('explore');$('exploreSearch').value=q;loadExplore(q);}});
  $('globalSearch')?.addEventListener('input',()=>{});
  $$('[data-topic]').forEach(button=>button.addEventListener('click',()=>{go('explore');$('exploreSearch').value=button.dataset.topic;loadExplore(button.dataset.topic);}));
  $$('[data-feed-filter]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.feedFilter==='following'&&!requireAuth('Sign in to see posts from members you follow.'))return;
    state.feedFilter=button.dataset.feedFilter;$$('[data-feed-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',b===button?'true':'false');});
    state.postOffset=0;loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});
  }));
  $('refreshFeed')?.addEventListener('click',()=>{state.postOffset=0;loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});loadStories();});
  $('loadMorePosts')?.addEventListener('click',()=>{state.postOffset+=20;loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:false});});
  $('themeToggle')?.addEventListener('click',flipTheme); $('themeToggle')?.setAttribute('aria-pressed','false');
  async function inviteFriends(){const url=location.origin+location.pathname;try{if(navigator.share)await navigator.share({title:'TeslaInvestorHub',text:'Join our independent EV and technology community.',url});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);showToast('Community link copied. Share it with a friend.');}else prompt('Copy the community link:',url);}catch(error){if(error.name!=='AbortError')showToast('Copy this link to invite friends: '+url);}}
  $('inviteFriends')?.addEventListener('click',inviteFriends);$('inviteFriendsTop')?.addEventListener('click',inviteFriends);
  function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem('tih_theme',theme);const btn=$('themeToggle');if(btn){btn.textContent=theme==='dark'?'☀':'☾';btn.title=theme==='dark'?'Switch to light mode':'Switch to dark mode';btn.setAttribute('aria-pressed',String(theme==='dark'));}}
  function flipTheme(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');if(state.activePage==='markets')loadMarketChart(state.activeSymbol);}
  applyTheme(localStorage.getItem('tih_theme')|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

  function openAuth(mode='signin'){$('authModal')?.classList.remove('hidden');setAuthMode(mode);setStatus('authStatus','');setTimeout(()=>$(mode==='signup'?'authDisplayName':'authEmail')?.focus(),80);}
  function closeAuth(){hide($('authModal'));}
  function setAuthMode(mode){state.authMode=mode;$('authSignInTab')?.classList.toggle('active',mode==='signin');$('authSignUpTab')?.classList.toggle('active',mode==='signup');$('authNameWrap')?.classList.toggle('hidden',mode!=='signup');$('authPasswordWrap')?.classList.toggle('hidden',mode==='recovery');$('authPassword').required=mode!=='recovery';$('authPassword').autocomplete=mode==='newpassword'?'new-password':'current-password';$('authTitle').textContent=mode==='signup'?'Create your account':mode==='recovery'?'Reset your password':mode==='newpassword'?'Choose a new password':'Welcome to the hub';$('authIntro').textContent=mode==='signup'?'Join the EV and technology community.':mode==='recovery'?'We will send a secure password-reset link if the email matches an account.':mode==='newpassword'?'Choose a strong new password for your account.':'Sign in to publish, follow members and message people.';$('authSubmit').textContent=mode==='signup'?'Create account':mode==='recovery'?'Send reset link':mode==='newpassword'?'Save new password':'Sign in';$('forgotPassword').classList.toggle('hidden',mode!=='signin');$('authSignInTab').classList.toggle('hidden',mode==='recovery'||mode==='newpassword');$('authSignUpTab').classList.toggle('hidden',mode==='recovery'||mode==='newpassword');}
  $('signIn')?.addEventListener('click',()=>state.user?go('profile'):openAuth('signin'));
  $('signInAgain')?.addEventListener('click',()=>state.user?go('profile'):openAuth('signin'));
  $('closeAuth')?.addEventListener('click',closeAuth);
  $('authModal')?.addEventListener('click',event=>{if(event.target===$('authModal'))closeAuth();});
  $('authSignInTab')?.addEventListener('click',()=>setAuthMode('signin'));$('authSignUpTab')?.addEventListener('click',()=>setAuthMode('signup'));
  $('forgotPassword')?.addEventListener('click',()=>setAuthMode('recovery'));
  $('authForm')?.addEventListener('submit',async event=>{
    event.preventDefault();if(!state.db){setStatus('authStatus','The sign-in service is not available yet. Refresh this page and try again.');return;}
    const button=$('authSubmit');setBusy(button,true,'Please wait…');setStatus('authStatus','');
    try{
      const email=$('authEmail').value.trim(),password=$('authPassword').value;
      if(state.authMode==='signup'){
        const displayName=$('authDisplayName').value.trim()||email.split('@')[0];
        const result=await state.db.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:location.origin+location.pathname}});if(result.error)throw result.error;
        if(result.data.session){await ensureProfile(result.data.user,displayName);setStatus('authStatus','Account created. Welcome to the community!');showToast('Welcome to the hub!');setTimeout(closeAuth,650);}else{setStatus('authStatus','Registration started. Check your email for a confirmation link, then return here to sign in.');}
      }else if(state.authMode==='recovery'){
        const result=await state.db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(result.error)throw result.error;setStatus('authStatus','If the email matches an account, a password reset link has been sent. Check your inbox and spam folder.');
      }else if(state.authMode==='newpassword'){
        const result=await state.db.auth.updateUser({password});if(result.error)throw result.error;setStatus('authStatus','Password updated successfully.');showToast('Password updated.');setTimeout(closeAuth,650);
      }else{
        const result=await state.db.auth.signInWithPassword({email,password});if(result.error)throw result.error;await ensureProfile(result.data.user);setStatus('authStatus','Signed in successfully.');showToast('You are signed in.');setTimeout(closeAuth,450);
      }
    }catch(error){setStatus('authStatus',error.message||'Could not complete sign-in. Please try again.');}
    finally{setBusy(button,false);}
  });
  $('tihPasswordReset')?.addEventListener('click',()=>openAuth('recovery'));
  $('tihSignOut')?.addEventListener('click',async()=>{if(!state.db||!state.user)return;const {error}=await state.db.auth.signOut();if(error)showToast(error.message);else showToast('You have signed out.');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){hide($('storyModal'));hide($('storyUploadModal'));closeAuth();}});

  async function ensureProfile(user,preferredName){
    if(!user||!state.db)return null;
    const displayName=preferredName||user.user_metadata?.display_name||user.email?.split('@')[0]||'Member';
    const found=await state.db.from('profiles').select('id,display_name,handle,avatar_url,bio').eq('id',user.id).maybeSingle();
    if(found.error){console.warn('profile query:',found.error.message);state.profile={id:user.id,display_name:displayName,handle:'',avatar_url:'',bio:''};return state.profile;}
    if(found.data){state.profile=found.data;return state.profile;}
    const inserted=await state.db.from('profiles').upsert({id:user.id,display_name:displayName},{onConflict:'id'}).select('id,display_name,handle,avatar_url,bio').maybeSingle();
    if(inserted.error){console.warn('profile create:',inserted.error.message);state.profile={id:user.id,display_name:displayName,handle:'',avatar_url:'',bio:''};}
    else state.profile=inserted.data||{id:user.id,display_name:displayName,handle:'',avatar_url:'',bio:''};
    return state.profile;
  }
  function updateAuthDisplay(){
    const user=state.user,profile=state.profile||{};const name=user?(profile.display_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Member'):'Guest explorer';
    $('signIn').textContent=user?'My account':'Sign in / Join';$('sidebarJoin').textContent=user?'✓ Account ready':'＋ Create account';$('tihSignOut').disabled=!user;$('accountProfileStatus').textContent=user?'Signed in as '+(user.email||name):'Not signed in yet.';
    $('sideName').textContent=name;$('sideHandle').textContent=user?(profile.handle?'@'+profile.handle:'Community member'):'Sign in to join the community';
    const av=avatarNode({display_name:name,avatar_url:profile.avatar_url},'avatar');$('sideAvatar').replaceWith(av);av.id='sideAvatar';
    const composer=avatarNode({display_name:name,avatar_url:profile.avatar_url},'avatar');$('composerAvatar')?.replaceWith(composer);composer.id='composerAvatar';
    $('postComposerHint').textContent=user?'Posting as '+name+'. Be respectful and do not share private information.':'Sign in to publish. The community feed is public to browse.';
  }
  async function onAuthChange(user){
    state.user=user||null;state.profile=null;
    if(state.user)await ensureProfile(state.user);
    updateAuthDisplay();
    state.postOffset=0;await loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});await loadStories();
    if(state.activePage==='messages')loadConversations();if(state.activePage==='notifications')loadNotifications();
    if(state.activePage==='saved')loadSavedPosts();if(state.activePage==='community')loadCommunityChat();if(state.user)loadNotificationsBadge().catch(()=>{});
  }

  async function uploadPhoto(file){
    if(!state.user)throw new Error('Sign in before uploading a photo.');
    if(!file)throw new Error('Choose an image first.');
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Use a JPG, PNG, WebP or GIF image.');
    if(file.size>8*1024*1024)throw new Error('Images must be 8 MB or smaller.');
    const extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' })[file.type]||'jpg';
    const path=state.user.id+'/'+Date.now()+'-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2))+'.'+extension;
    const result=await state.db.storage.from('social-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(result.error)throw new Error('Photo upload failed. Make sure the social-media storage bucket is created by the SQL setup. '+result.error.message);
    return state.db.storage.from('social-media').getPublicUrl(result.data.path).data.publicUrl;
  }
  function setPostImage(file){state.selectedPostFile=file||null;const wrap=$('postImagePreview');if(file){const url=URL.createObjectURL(file);$('previewImage').src=url;visible(wrap);}else{hide(wrap);$('previewImage').removeAttribute('src');}}
  $('socialPostImage')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(file){if(file.size>8*1024*1024){event.target.value='';showToast('Image is larger than 8 MB.');return;}setPostImage(file);}});
  $('removePostImage')?.addEventListener('click',()=>{setPostImage(null);$('socialPostImage').value='';});
  $('socialPostForm')?.addEventListener('submit',async event=>{
    event.preventDefault();if(!requireAuth('Sign in to publish a post.'))return;
    const body=$('socialPostBody').value.trim(),file=state.selectedPostFile;if(!body&&!file){showToast('Write something or attach a photo first.');return;}
    const button=$('publishPost');setBusy(button,true,'Publishing…');
    try{let image_url=null;if(file)image_url=await uploadPhoto(file);const result=await state.db.from('social_posts').insert({user_id:state.user.id,body,image_url}).select('id').single();if(result.error)throw result.error;$('socialPostBody').value='';$('socialPostImage').value='';setPostImage(null);state.postOffset=0;await loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});showToast('Your post is live.');}
    catch(error){showToast(friendlyDbError(error));}
    finally{setBusy(button,false);}
  });
  function friendlyDbError(error){const msg=String(error?.message||error||'Something went wrong.');if(/relation .* does not exist|schema cache|social_posts/i.test(msg))return 'Community features need one setup step: run social-hub-setup.sql in your Supabase SQL Editor, then refresh this page.';return msg;}

  async function fetchProfiles(ids){const uniq=[...new Set((ids||[]).filter(Boolean))];if(!uniq.length)return{};const result=await state.db.from('profiles').select('id,display_name,handle,avatar_url,bio').in('id',uniq);if(result.error)throw result.error;return Object.fromEntries((result.data||[]).map(p=>[p.id,p]));}
  async function postSupplement(rows){
    const ids=(rows||[]).map(p=>p.id);if(!ids.length)return {likes:[],comments:[],saved:new Set(),following:new Set(),profiles:{}};
    const tasks=[state.db.from('social_post_likes').select('post_id,user_id').in('post_id',ids),state.db.from('social_post_comments').select('id,post_id,user_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}).limit(300)];
    if(state.user){tasks.push(state.db.from('social_post_saves').select('post_id').eq('user_id',state.user.id).in('post_id',ids));tasks.push(state.db.from('social_follows').select('followed_id').eq('follower_id',state.user.id));}else{tasks.push(Promise.resolve({data:[],error:null}));tasks.push(Promise.resolve({data:[],error:null}));}
    const [likesRes,commentsRes,savedRes,followingRes]=await Promise.all(tasks);for(const item of [likesRes,commentsRes,savedRes,followingRes])if(item.error)throw item.error;
    const commentUserIds=(commentsRes.data||[]).map(x=>x.user_id);const profiles=await fetchProfiles([...rows.map(x=>x.user_id),...commentUserIds]);
    const comments=(commentsRes.data||[]).map(c=>({...c,profile:profiles[c.user_id]||{display_name:'Member'}}));
    return {likes:likesRes.data||[],comments,saved:new Set((savedRes.data||[]).map(x=>x.post_id)),following:new Set((followingRes.data||[]).map(x=>x.followed_id)),profiles};
  }
  async function loadSocialFeed(targetId='socialFeed',options={}){
    const target=$(targetId);if(!target)return;
    const statusId=targetId==='exploreFeed'?'exploreStatus':targetId==='savedFeed'?'savedStatus':'socialFeedStatus';
    const reset=options.reset!==false;const filter=options.filter||'for-you';
    if(reset){target.replaceChildren();setStatus(statusId,'Loading community posts…');}
    if(!state.db){renderSetupPrompt(target,statusId);return;}
    try{
      const rangeStart=reset?0:state.postOffset;let query=state.db.from('social_posts').select('id,user_id,body,image_url,created_at').order('created_at',{ascending:false}).range(rangeStart,rangeStart+(targetId==='exploreFeed'?99:19));
      if(filter==='photos')query=query.not('image_url','is',null);
      if(filter==='following'&&!state.user){target.replaceChildren();showEmpty(target,'Sign in to see your following feed','Follow members and their future posts will appear here.');setStatus(statusId,'');$('loadMorePosts')?.classList.add('hidden');return;}
      if(filter==='following'&&state.user){const f=await state.db.from('social_follows').select('followed_id').eq('follower_id',state.user.id);if(f.error)throw f.error;const ids=(f.data||[]).map(x=>x.followed_id);if(!ids.length){target.replaceChildren();target.innerHTML='';showEmpty(target,'No followed posts yet','Follow members whose posts you enjoy. Their future posts will appear here.');setStatus(statusId,'');$('loadMorePosts')?.classList.add('hidden');return;}query=query.in('user_id',ids);}
      const result=await query;if(result.error)throw result.error;let rows=result.data||[];
      const globalQ=(targetId==='exploreFeed'?($('exploreSearch')?.value||''):state.search).trim().toLowerCase();if(globalQ)rows=rows.filter(p=>String(p.body||'').toLowerCase().includes(globalQ));
      if(!rows.length&&reset){target.replaceChildren();showEmpty(target,'Your community starts here','No posts match this view yet. Be one of the first members to share something useful.');setStatus(statusId,'');if(targetId==='socialFeed')$('loadMorePosts')?.classList.add('hidden');return;}
      const supplement=await postSupplement(rows);let decorated=rows.map(row=>({...row,profile:supplement.profiles[row.user_id]||{display_name:'Member'},likes:supplement.likes.filter(x=>x.post_id===row.id),comments:supplement.comments.filter(x=>x.post_id===row.id),liked:supplement.likes.some(x=>x.post_id===row.id&&x.user_id===state.user?.id),saved:supplement.saved.has(row.id),following:supplement.following.has(row.user_id)}));
      if(targetId==='exploreFeed'&&state.exploreSort==='popular')decorated.sort((a,b)=>(b.likes.length+b.comments.length)-(a.likes.length+a.comments.length));
      if(targetId==='exploreFeed'&&state.exploreSort==='photos')decorated=decorated.filter(p=>p.image_url);
      if(reset)target.replaceChildren();decorated.forEach(post=>target.append(renderPost(post,targetId)));
      if(reset)state.posts=decorated;else state.posts=state.posts.concat(decorated);
      setStatus(statusId,decorated.length?'Showing public posts from community members. Posts are member-generated and have not been independently verified.':'');
      if(targetId==='socialFeed'){$('loadMorePosts')?.classList.toggle('hidden',rows.length<20);}
    }catch(error){if(reset)target.replaceChildren();if(/does not exist|schema cache|social_posts/i.test(error.message||'')){renderSetupPrompt(target,statusId);}else{showEmpty(target,'Could not load the feed',friendlyDbError(error));setStatus(statusId,'Feed refresh failed.');}}
  }
  function renderSetupPrompt(target,statusId){setStatus(statusId,'Social data needs its one-time database setup.');const card=document.createElement('div');card.className='empty-state';card.innerHTML='<div class="empty-icon">✦</div><strong>Prepare your community</strong><span>This website is ready for member posts, likes, comments, saves, stories, private messages and notifications. The database tables have to be created in Supabase before these features can store data.</span><p class="tiny">Run the included <b>social-hub-setup.sql</b> file in Supabase → SQL Editor → New query, then refresh this page.</p>';target.append(card);}
  function showEmpty(target,title,description){const el=document.createElement('div');el.className='empty-state';const icon=document.createElement('div');icon.className='empty-icon';icon.textContent='✧';const h=document.createElement('strong');h.textContent=title;const p=document.createElement('div');p.textContent=description;el.append(icon,h,p);target.append(el);}
  function renderPost(post,targetId='socialFeed'){
    const card=document.createElement('article');card.className='panel post-card';card.id='post-'+post.id;card.dataset.postId=post.id;
    const head=document.createElement('div');head.className='post-head';head.append(avatarNode(post.profile));const author=document.createElement('div');author.className='post-author';const strong=document.createElement('strong');strong.textContent=post.profile.display_name||'Member';const meta=document.createElement('small');meta.textContent=(post.profile.handle?'@'+post.profile.handle+' · ':'')+plainDate(post.created_at);author.append(strong,meta);head.append(author);
    const actions=document.createElement('div');actions.className='post-head-actions';if(state.user&&state.user.id!==post.user_id){const follow=document.createElement('button');follow.className='secondary-btn btn-small follow-btn';follow.dataset.action='follow';follow.dataset.userId=post.user_id;follow.textContent=post.following?'Following':'＋ Follow';actions.append(follow);}if(state.user&&state.user.id===post.user_id){const del=document.createElement('button');del.className='ghost-btn btn-small';del.dataset.action='delete-post';del.textContent='Delete';actions.append(del);}else{const report=document.createElement('button');report.className='ghost-btn btn-small';report.dataset.action='report-post';report.textContent='Report';actions.append(report);}head.append(actions);card.append(head);
    if(post.body){const text=document.createElement('div');text.className='post-body';text.textContent=post.body;card.append(text);}if(post.image_url&&safeUrl(post.image_url)){const img=document.createElement('img');img.className='post-image';img.src=post.image_url;img.alt='Photo shared by '+(post.profile.display_name||'a community member');img.loading='lazy';img.addEventListener('error',()=>{img.alt='Photo unavailable';img.style.display='none';},{once:true});card.append(img);}
    const stats=document.createElement('div');stats.className='post-stats';const likeCount=document.createElement('span');likeCount.textContent='♥ '+post.likes.length+' likes';const commentCount=document.createElement('span');commentCount.textContent=post.comments.length+' comments';stats.append(likeCount,commentCount);card.append(stats);
    const postActions=document.createElement('div');postActions.className='post-actions';[['like',post.liked?'♥':'♡',post.liked?'Liked':'Like',post.liked?'liked':''],['comments','▱','Comment',''],['save',post.saved?'▣':'▱',post.saved?'Saved':'Save',post.saved?'saved':''],['share','↗','Share','']].forEach(([act,ico,label,extra])=>{const b=document.createElement('button');b.className='post-action '+extra;b.dataset.action=act;b.setAttribute('aria-label',label);b.innerHTML='<span aria-hidden="true">'+ico+'</span><span>'+label+'</span>';postActions.append(b);});card.append(postActions);
    const commentArea=document.createElement('div');commentArea.className='comment-area';commentArea.dataset.commentArea='';commentArea.classList.add('hidden');(post.comments||[]).slice(-5).forEach(c=>{const row=document.createElement('div');row.className='comment-item';const name=document.createElement('strong');name.textContent=(c.profile&&c.profile.display_name)||'Member';const body=document.createElement('span');body.textContent=c.body;row.append(name,body);commentArea.append(row);});
    const form=document.createElement('form');form.className='comment-form';form.dataset.commentForm='';const input=document.createElement('input');input.maxLength=1000;input.placeholder=state.user?'Write a helpful comment…':'Sign in to comment';input.disabled=!state.user;input.setAttribute('aria-label','Write a comment');const send=document.createElement('button');send.type='submit';send.textContent='Send';send.disabled=!state.user;form.append(input,send);commentArea.append(form);card.append(commentArea);
    if(targetId==='savedFeed')card.classList.add('saved-card');return card;
  }
  function findPostId(element){return element.closest('[data-post-id]')?.dataset.postId||null;}
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,card=button.closest('[data-post-id]'),postId=findPostId(button);if(!postId)return;
    if(action==='comments'){const area=card.querySelector('[data-comment-area]');area.classList.toggle('hidden');if(!area.classList.contains('hidden'))area.querySelector('input')?.focus();return;}
    if(['like','save','follow','delete-post','report-post'].includes(action)&&!requireAuth())return;
    try{
      if(action==='share'){
        const shareUrl=location.origin+location.pathname+'#post-'+postId;const shareText='Community post on TeslaInvestorHub';if(navigator.share){try{await navigator.share({title:'TeslaInvestorHub',text:shareText,url:shareUrl});}catch(error){if(error.name!=='AbortError')throw error;}}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareUrl);showToast('Post link copied.');}else{prompt('Copy this post link:',shareUrl);}return;
      }else if(action==='like'){
        const existing=await state.db.from('social_post_likes').select('post_id').eq('post_id',postId).eq('user_id',state.user.id).maybeSingle();if(existing.error)throw existing.error;
        const result=existing.data?await state.db.from('social_post_likes').delete().eq('post_id',postId).eq('user_id',state.user.id):await state.db.from('social_post_likes').insert({post_id:postId,user_id:state.user.id});if(result.error)throw result.error;await refreshVisibleFeeds();
      }else if(action==='save'){
        const existing=await state.db.from('social_post_saves').select('post_id').eq('post_id',postId).eq('user_id',state.user.id).maybeSingle();if(existing.error)throw existing.error;
        const result=existing.data?await state.db.from('social_post_saves').delete().eq('post_id',postId).eq('user_id',state.user.id):await state.db.from('social_post_saves').insert({post_id:postId,user_id:state.user.id});if(result.error)throw result.error;showToast(existing.data?'Removed from saved posts.':'Post saved.');await refreshVisibleFeeds();
      }else if(action==='follow'){
        const other=button.dataset.userId;if(!other)return;const existing=await state.db.from('social_follows').select('followed_id').eq('follower_id',state.user.id).eq('followed_id',other).maybeSingle();if(existing.error)throw existing.error;
        const result=existing.data?await state.db.from('social_follows').delete().eq('follower_id',state.user.id).eq('followed_id',other):await state.db.from('social_follows').insert({follower_id:state.user.id,followed_id:other});if(result.error)throw result.error;showToast(existing.data?'You unfollowed this member.':'You are now following this member.');await refreshVisibleFeeds();
      }else if(action==='delete-post'){
        if(!confirm('Delete this post? This cannot be undone.'))return;const result=await state.db.from('social_posts').delete().eq('id',postId).eq('user_id',state.user.id);if(result.error)throw result.error;card.remove();showToast('Post deleted.');
      }else if(action==='report-post'){
        const reason=prompt('Why are you reporting this post?');if(!reason||!reason.trim())return;const result=await state.db.from('social_reports').insert({reporter_id:state.user.id,post_id:postId,reason:reason.trim().slice(0,500)});if(result.error)throw result.error;showToast('Report submitted for review.');
      }
    }catch(error){showToast(friendlyDbError(error));}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-comment-form]');if(!form)return;event.preventDefault();if(!requireAuth())return;const card=form.closest('[data-post-id]'),postId=card?.dataset.postId,input=form.querySelector('input'),body=input?.value.trim();if(!body||!postId)return;const button=form.querySelector('button');setBusy(button,true,'…');try{const result=await state.db.from('social_post_comments').insert({post_id:postId,user_id:state.user.id,body});if(result.error)throw result.error;input.value='';await refreshVisibleFeeds();const fresh=$(card.id);if(fresh){fresh.querySelector('[data-comment-area]')?.classList.remove('hidden');fresh.querySelector('[data-comment-area] input')?.focus();}showToast('Comment added.');}catch(error){showToast(friendlyDbError(error));}finally{setBusy(button,false);}
  });
  async function refreshVisibleFeeds(){state.postOffset=0;await loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});if(state.activePage==='explore')await loadExplore($('exploreSearch')?.value||'');if(state.activePage==='saved')await loadSavedPosts();}

  async function loadStories(){const target=$('storiesList');if(!target)return;target.replaceChildren();const add=document.createElement('button');add.className='story story-add';add.id='storyCreateBtn';add.type='button';add.innerHTML='<span class="story-ring"><span class="story-ring-inner"><span>＋</span></span></span><span class="story-name">Your story</span>';add.addEventListener('click',()=>{if(!requireAuth())return;showStoryUpload();});target.append(add);const status=document.createElement('div');status.id='storiesStatus';status.className='tiny';target.append(status);
    if(!state.db){status.textContent='Stories are not connected yet.';return;}
    try{const result=await state.db.from('social_stories').select('id,user_id,image_url,caption,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(30);if(result.error)throw result.error;const rows=result.data||[];const profiles=await fetchProfiles(rows.map(x=>x.user_id));state.storyItems=rows.map(x=>({...x,profile:profiles[x.user_id]||{display_name:'Member'}}));if(!state.storyItems.length){status.textContent='No stories yet — be the first to share a moment.';return;}status.remove();state.storyItems.forEach(story=>{const btn=document.createElement('button');btn.className='story';btn.type='button';btn.append(avatarNode(story.profile,'story-ring-inner'));const wrap=document.createElement('span');wrap.className='story-ring';const inner=avatarNode(story.profile,'story-ring-inner');wrap.replaceChildren(inner);const name=document.createElement('span');name.className='story-name';name.textContent=story.profile.display_name||'Member';btn.replaceChildren(wrap,name);btn.addEventListener('click',()=>openStory(story));target.append(btn);});}
    catch(error){status.textContent=/does not exist|schema cache/i.test(error.message||'')?'Run social-hub-setup.sql in Supabase to enable stories.':'Stories could not load right now.';}
  }
  function showStoryUpload(){visible($('storyUploadModal'));setStatus('storyUploadStatus','');}
  $('storyCreateBtn')?.addEventListener('click',()=>{if(requireAuth())showStoryUpload();});$('addStoryLink')?.addEventListener('click',()=>{if(requireAuth())showStoryUpload();});$('closeStoryUpload')?.addEventListener('click',()=>hide($('storyUploadModal')));$('storyUploadModal')?.addEventListener('click',event=>{if(event.target===$('storyUploadModal'))hide($('storyUploadModal'));});$('closeStory')?.addEventListener('click',()=>hide($('storyModal')));$('storyModal')?.addEventListener('click',event=>{if(event.target===$('storyModal'))hide($('storyModal'));});
  function openStory(story){$('storyModalImage').src=story.image_url;$('storyModalImage').alt=(story.profile?.display_name||'Member')+' story';$('storyModalCaption').textContent=(story.profile?.display_name||'Member')+(story.caption?' · '+story.caption:'')+' · '+plainDate(story.created_at);visible($('storyModal'));}
  $('storyForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireAuth())return;const file=$('storyImage').files?.[0];if(!file)return;const button=$('publishStory');setBusy(button,true,'Uploading…');setStatus('storyUploadStatus','Uploading your story…');try{const image_url=await uploadPhoto(file);const result=await state.db.from('social_stories').insert({user_id:state.user.id,image_url,caption:$('storyCaption').value.trim(),expires_at:new Date(Date.now()+24*60*60*1000).toISOString()});if(result.error)throw result.error;$('storyForm').reset();hide($('storyUploadModal'));await loadStories();showToast('Your story is live for 24 hours.');}catch(error){setStatus('storyUploadStatus',friendlyDbError(error));}finally{setBusy(button,false);}});

  async function loadExplore(q=''){$('exploreStatus').textContent='Loading public posts…';await loadSocialFeed('exploreFeed',{filter:'for-you',reset:true});}
  $('exploreSearch')?.addEventListener('input',()=>{clearTimeout(state.exploreTimer);state.exploreTimer=setTimeout(()=>loadExplore($('exploreSearch').value.trim()),250);});
  $$('[data-explore-sort]').forEach(button=>button.addEventListener('click',()=>{state.exploreSort=button.dataset.exploreSort;$$('[data-explore-sort]').forEach(x=>x.classList.toggle('active',x===button));loadExplore($('exploreSearch')?.value||'');}));
  async function loadSavedPosts(){const target=$('savedFeed');target.replaceChildren();if(!requireAuth('Sign in to view saved posts.')){showEmpty(target,'Your saved posts are private','Sign in to save posts and find them here later.');return;}setStatus('savedStatus','Loading saved posts…');try{const saved=await state.db.from('social_post_saves').select('post_id,created_at').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100);if(saved.error)throw saved.error;const ids=(saved.data||[]).map(x=>x.post_id);if(!ids.length){showEmpty(target,'Nothing saved yet','Tap Save on a helpful post to keep it for later.');setStatus('savedStatus','');return;}const res=await state.db.from('social_posts').select('id,user_id,body,image_url,created_at').in('id',ids).order('created_at',{ascending:false});if(res.error)throw res.error;const supp=await postSupplement(res.data||[]);(res.data||[]).forEach(row=>{const p={...row,profile:supp.profiles[row.user_id]||{display_name:'Member'},likes:supp.likes.filter(x=>x.post_id===row.id),comments:supp.comments.filter(x=>x.post_id===row.id),liked:supp.likes.some(x=>x.post_id===row.id&&x.user_id===state.user.id),saved:true,following:supp.following.has(row.user_id)};target.append(renderPost(p,'savedFeed'));});setStatus('savedStatus','Saved posts are visible only to you.');}catch(error){showEmpty(target,'Could not load saved posts',friendlyDbError(error));setStatus('savedStatus','');}}
  $('refreshSaved')?.addEventListener('click',loadSavedPosts);

  async function loadNotifications(){const target=$('notificationsFeed');if(!target)return;target.replaceChildren();if(!requireAuth('Sign in to see notifications.')){showEmpty(target,'Your notifications live here','Sign in to see likes, comments and new followers.');return;}setStatus('notificationsStatus','Loading recent activity…');try{const result=await state.db.from('social_notifications').select('id,actor_id,kind,post_id,created_at,read_at,detail').eq('recipient_id',state.user.id).order('created_at',{ascending:false}).limit(50);if(result.error)throw result.error;const rows=result.data||[];const profiles=await fetchProfiles(rows.map(x=>x.actor_id));if(!rows.length){showEmpty(target,'No notifications yet','When someone likes your post, comments or follows you, the update will appear here.');$('notificationBadge').classList.add('hidden');setStatus('notificationsStatus','');return;}const unread=rows.filter(x=>!x.read_at).length;$('notificationBadge').textContent=unread>99?'99+':String(unread);$('notificationBadge').classList.toggle('hidden',unread===0);rows.forEach(item=>{const row=document.createElement('div');row.className='notification-row'+(!item.read_at?' unread':'');const dot=document.createElement('span');dot.className='notification-dot';if(item.read_at)dot.style.visibility='hidden';const text=document.createElement('div');text.className='notification-copy';const p=document.createElement('div');const name=(profiles[item.actor_id]?.display_name)||'A member';p.textContent=name+({like:' liked your post.',comment:' commented on your post.',follow:' started following you.'}[item.kind]||' interacted with your profile.');if(item.detail){p.textContent+=' “'+item.detail+'”';}const time=document.createElement('small');time.textContent=plainDate(item.created_at);text.append(p,time);row.append(dot,text);target.append(row);});setStatus('notificationsStatus',unread?unread+' unread notification'+(unread===1?'':'s')+'.':'All caught up.');}catch(error){showEmpty(target,'Notifications unavailable',friendlyDbError(error));setStatus('notificationsStatus','');}}
  $('markNotificationsRead')?.addEventListener('click',async()=>{if(!requireAuth())return;try{const result=await state.db.from('social_notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',state.user.id).is('read_at',null);if(result.error)throw result.error;await loadNotifications();showToast('Notifications marked as read.');}catch(error){showToast(friendlyDbError(error));}});

  $('memberSearchForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireAuth('Sign in to message members.'))return;const q=$('memberSearchInput').value.trim().replace(/^@/,'').replace(/[(),]/g,'');const target=$('memberSearchResults');target.replaceChildren();if(q.length<2){showToast('Enter at least two characters.');return;}try{const result=await state.db.from('profiles').select('id,display_name,handle,avatar_url,bio').or('handle.ilike.%'+q+'%,display_name.ilike.%'+q+'%').neq('id',state.user.id).limit(12);if(result.error)throw result.error;if(!(result.data||[]).length){showEmpty(target,'No members found','Try part of their display name or exact handle.');return;}result.data.forEach(profile=>{const button=document.createElement('button');button.className='result-person';button.type='button';button.append(avatarNode(profile));const copy=document.createElement('span');copy.className='conversation-copy';const strong=document.createElement('strong');strong.textContent=profile.display_name||'Member';const small=document.createElement('small');small.textContent=profile.handle?'@'+profile.handle:(profile.bio||'Community member');copy.append(strong,small);button.append(copy);button.addEventListener('click',()=>selectConversation(profile));target.append(button);});}catch(error){showToast(friendlyDbError(error));}});
  async function loadConversations(){const list=$('conversationList');if(!list)return;list.replaceChildren();if(!state.user){showEmpty(list,'Sign in to message','Private messages are available to signed-in members.');return;}try{const result=await state.db.from('social_messages').select('id,sender_id,recipient_id,body,created_at').or('sender_id.eq.'+state.user.id+',recipient_id.eq.'+state.user.id).order('created_at',{ascending:false}).limit(100);if(result.error)throw result.error;const rows=result.data||[];const latest=new Map();rows.forEach(m=>{const other=m.sender_id===state.user.id?m.recipient_id:m.sender_id;if(!latest.has(other))latest.set(other,m);});if(!latest.size){showEmpty(list,'No conversations yet','Search for a member above to start a private message.');return;}const profiles=await fetchProfiles([...latest.keys()]);latest.forEach((message,id)=>{const person=profiles[id]||{id,display_name:'Member'};const button=document.createElement('button');button.className='conversation-item'+(state.activeConversation?.id===id?' active':'');button.type='button';button.append(avatarNode(person));const copy=document.createElement('span');copy.className='conversation-copy';const strong=document.createElement('strong');strong.textContent=person.display_name||'Member';const small=document.createElement('small');small.textContent=message.body;copy.append(strong,small);button.append(copy);button.addEventListener('click',()=>selectConversation(person));list.append(button);});}catch(error){showEmpty(list,'Messages unavailable',friendlyDbError(error));}}
  async function selectConversation(person){if(!requireAuth())return;state.activeConversation=person;$('activeConversationHead').replaceChildren(avatarNode(person),document.createTextNode(person.display_name||'Member'));$('messageText').disabled=false;$('sendMessage').disabled=false;await loadConversationThread();await loadConversations();}
  async function loadConversationThread(){const person=state.activeConversation,log=$('messageLog');if(!person||!state.user)return;log.replaceChildren();try{const a='and(sender_id.eq.'+state.user.id+',recipient_id.eq.'+person.id+')';const b='and(sender_id.eq.'+person.id+',recipient_id.eq.'+state.user.id+')';const result=await state.db.from('social_messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(a+','+b).order('created_at',{ascending:true}).limit(100);if(result.error)throw result.error;if(!(result.data||[]).length){showEmpty(log,'Say hello','Keep conversations friendly. Never send passwords or verification codes.');return;}const incoming=[];result.data.forEach(m=>{const bubble=document.createElement('div');bubble.className='bubble'+(m.sender_id===state.user.id?' mine':'');const body=document.createElement('div');body.textContent=m.body;const time=document.createElement('small');time.textContent=plainDate(m.created_at);bubble.append(body,time);log.append(bubble);if(m.recipient_id===state.user.id&&!m.read_at)incoming.push(m.id);});log.scrollTop=log.scrollHeight;if(incoming.length){state.db.from('social_messages').update({read_at:new Date().toISOString()}).in('id',incoming).eq('recipient_id',state.user.id).then(()=>{});}}catch(error){showEmpty(log,'Could not load messages',friendlyDbError(error));}}
  $('messageSendForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireAuth())return;const person=state.activeConversation,body=$('messageText').value.trim();if(!person||!body)return;const button=$('sendMessage');setBusy(button,true,'Sending…');try{const result=await state.db.from('social_messages').insert({sender_id:state.user.id,recipient_id:person.id,body});if(result.error)throw result.error;$('messageText').value='';await loadConversationThread();await loadConversations();}catch(error){showToast(friendlyDbError(error));}finally{setBusy(button,false);}});
  $('refreshConversations')?.addEventListener('click',loadConversations);

  $('profileForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireAuth('Sign in to edit your profile.'))return;const button=$('saveProfile');setBusy(button,true,'Saving…');setStatus('profileStatus','');try{const display_name=$('profileDisplayName').value.trim(),handle=$('profileHandle').value.trim().replace(/^@/,'')||null,avatar_url=$('profileAvatarUrl').value.trim()||null,bio=$('profileBio').value.trim();if(!display_name)throw new Error('Display name is required.');if(handle&&!/^[A-Za-z0-9_.]{3,24}$/.test(handle))throw new Error('Handle must be 3–24 letters, numbers, underscores or dots.');if(avatar_url&&!safeUrl(avatar_url))throw new Error('Avatar URL must start with http or https.');const result=await state.db.from('profiles').update({display_name,handle,avatar_url,bio}).eq('id',state.user.id).select('id,display_name,handle,avatar_url,bio').single();if(result.error)throw result.error;state.profile=result.data;updateAuthDisplay();setStatus('profileStatus','Profile saved successfully.');showToast('Profile updated.');}catch(error){setStatus('profileStatus',friendlyDbError(error));}finally{setBusy(button,false);}});
  async function loadProfileForm(){if(!state.user){$('accountProfileStatus').textContent='Not signed in yet.';return;}if(!state.profile)await ensureProfile(state.user);const p=state.profile||{};$('profileDisplayName').value=p.display_name||'';$('profileHandle').value=p.handle||'';$('profileAvatarUrl').value=p.avatar_url||'';$('profileBio').value=p.bio||'';$('accountProfileStatus').textContent='Signed in as '+(state.user.email||p.display_name||'Member');}

  async function loadCommunityChat(){const target=$('feed');if(!target||!state.db)return;target.replaceChildren();if(!state.user){showEmpty(target,'Join the conversation','Sign in to read and send community chat messages.');return;}try{const result=await state.db.from('community_messages').select('id,user_id,display_name,message,created_at').order('created_at',{ascending:false}).limit(50);if(result.error)throw result.error;if(!(result.data||[]).length){showEmpty(target,'No messages yet','Be the first to share a useful thought.');return;}result.data.forEach(item=>{const row=document.createElement('article');row.className='notification-row';row.append(avatarNode({display_name:item.display_name}));const content=document.createElement('div');content.className='notification-copy';const strong=document.createElement('strong');strong.textContent=item.display_name||'Member';const body=document.createElement('div');body.textContent=item.message;const time=document.createElement('small');time.textContent=plainDate(item.created_at);content.append(strong,body,time);row.append(content);if(item.user_id===state.user.id){const del=document.createElement('button');del.className='ghost-btn btn-small';del.textContent='Delete';del.addEventListener('click',async()=>{if(!confirm('Delete this chat message?'))return;const result=await state.db.from('community_messages').delete().eq('id',item.id).eq('user_id',state.user.id);if(result.error)showToast(result.error.message);else loadCommunityChat();});row.append(del);}target.append(row);});}catch(error){showEmpty(target,'Chat not available',friendlyDbError(error));}}
  $('postForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!requireAuth('Sign in to send a chat message.'))return;const body=$('postBody').value.trim();if(!body)return;const button=event.submitter||event.target.querySelector('button[type=submit]');setBusy(button,true,'Sending…');try{const result=await state.db.from('community_messages').insert({user_id:state.user.id,display_name:state.profile?.display_name||state.user.email?.split('@')[0]||'Member',message:body});if(result.error)throw result.error;$('postBody').value='';await loadCommunityChat();showToast('Message sent.');}catch(error){showToast(friendlyDbError(error));}finally{setBusy(button,false);}});
  $('refreshChat')?.addEventListener('click',loadCommunityChat);


  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('installApp')?.classList.remove('hidden');});
  $('installApp')?.addEventListener('click',async()=>{if(!installPrompt){showToast('On Android, use Chrome menu → Add to Home screen.');return;}installPrompt.prompt();try{await installPrompt.userChoice;}catch(_){}installPrompt=null;$('installApp')?.classList.add('hidden');});
  window.addEventListener('appinstalled',()=>{installPrompt=null;$('installApp')?.classList.add('hidden');showToast('TeslaInvestorHub has been installed.');});

  function loadMarketChart(symbol){if(!symbol)symbol='NASDAQ:TSLA';state.activeSymbol=symbol;const target=$('mainChart');if(!target)return;target.replaceChildren();$('chartHeading').textContent=SYMBOLS[symbol]||symbol;$('marketExternal').href='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol);$$('#chartPairs button').forEach(b=>b.classList.toggle('active',b.dataset.symbol===symbol));const wrap=document.createElement('div');wrap.className='tradingview-widget-container';wrap.style.cssText='height:100%;width:100%';const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.cssText='height:calc(100% - 30px);width:100%';wrap.append(widget);const script=document.createElement('script');script.async=true;script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.text=JSON.stringify({autosize:true,symbol,interval:'D',timezone:'exchange',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',style:'1',withdateranges:true,allow_symbol_change:true,details:true,calendar:false,support_host:'https://www.tradingview.com',locale:'en'});wrap.append(script);target.append(wrap);}
  $$('#chartPairs button').forEach(button=>button.addEventListener('click',()=>loadMarketChart(button.dataset.symbol)));
  function loadMiniChart(){const target=$('miniMarketChart');if(!target)return;target.replaceChildren();const wrap=document.createElement('div');wrap.className='tradingview-widget-container';wrap.style.cssText='height:205px;width:100%';const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';wrap.append(widget);const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';script.async=true;script.text=JSON.stringify({symbol:'NASDAQ:TSLA',width:'100%',height:205,locale:'en',dateRange:'12M',colorTheme:document.documentElement.dataset.theme==='dark'?'dark':'light',isTransparent:true,autosize:true,largeChartUrl:'https://www.tradingview.com/symbols/NASDAQ-TSLA/'});wrap.append(script);target.append(wrap);}

  const newsSearchUrl=q=>'https://news.google.com/search?q='+encodeURIComponent(q+' when:7d')+'&hl=en-US&gl=US&ceid=US:en';
  function renderNews(){const target=$('newsFeed');if(!target)return;target.replaceChildren();const data=state.newsCache[state.newsKey]||[];if(!data.length){const card=document.createElement('article');card.className='panel news-card';const source=document.createElement('div');source.className='news-source';source.textContent='Live news search';const h=document.createElement('h3');h.textContent='The cached news feed has no headlines yet';const p=document.createElement('p');p.textContent='The automatic news workflow may still be waiting for its first successful sync. Use a live publisher search while the cache is updated.';const a=document.createElement('a');a.className='primary-btn';a.href=newsSearchUrl(TOPICS[state.newsKey]?.q||'Tesla news');a.target='_blank';a.rel='noopener noreferrer';a.textContent='Search current headlines ↗';card.append(source,h,p,a);target.append(card);return;}data.slice(0,50).forEach(item=>{const card=document.createElement('article');card.className='panel news-card';const source=document.createElement('div');source.className='news-source';source.textContent=item.source||'News publisher';const h=document.createElement('h3');h.textContent=item.title||'Untitled story';const p=document.createElement('p');p.textContent=String(item.description||'').replace(/\s+/g,' ').slice(0,260);const meta=document.createElement('div');meta.className='news-meta';const date=document.createElement('small');date.textContent=plainDate(item.pubDate);const a=document.createElement('a');a.className='secondary-btn btn-small';a.href=safeUrl(item.link)||newsSearchUrl(TOPICS[state.newsKey]?.q||'Tesla news');a.target='_blank';a.rel='noopener noreferrer';a.textContent='Read original ↗';meta.append(date,a);card.append(source,h);if(p.textContent)card.append(p);card.append(meta);target.append(card);});}
  async function loadNews(key='tesla',quiet=false){state.newsKey=key||state.newsKey;$$('[data-news-cat]').forEach(b=>b.classList.toggle('active',b.dataset.newsCat===state.newsKey));if(!quiet)setStatus('newsStatus','Loading saved headlines for '+(TOPICS[state.newsKey]?.label||'this topic')+'…');try{if(!state.newsCache[state.newsKey]){const path=location.pathname;const base=path.endsWith('/')?path:path.slice(0,path.lastIndexOf('/')+1);const result=await fetch(base+'news.json?t='+Date.now(),{cache:'no-store'});if(!result.ok)throw new Error('News cache is not ready');const data=await result.json();Object.keys(data.categories||{}).forEach(cat=>state.newsCache[cat]=data.categories[cat]?.stories||[]);}const stories=state.newsCache[state.newsKey]||[];setStatus('newsStatus',stories.length?'Showing '+stories.length+' headlines. Stories link to original publishers.':'No cached headlines yet. Use live search while the automated feed is repaired.');renderNews();}catch(_){state.newsCache[state.newsKey]=[];setStatus('newsStatus','News feed is unavailable at the moment. Live headline search is available below.');renderNews();}}
  $$('[data-news-cat]').forEach(button=>button.addEventListener('click',()=>loadNews(button.dataset.newsCat)));
  $('newsRefresh')?.addEventListener('click',()=>{state.newsCache={};loadNews(state.newsKey);});
  setInterval(()=>{if(!document.hidden&&state.activePage==='news'){state.newsCache={};loadNews(state.newsKey,true);}},30*60*1000);

  async function loadTeslaGallery(){const box=$('teslaGallery');if(!box||state.galleryLoaded)return;state.galleryLoaded=true;setStatus('galleryStatus','Searching Wikimedia Commons for freely licensed Tesla photos…');const queries=['Tesla Model 3','Tesla Model Y','Tesla Model S','Tesla Model X','Tesla Cybertruck','Tesla Roadster'];const found=[],seen=new Set();function plain(v){const d=document.createElement('div');d.innerHTML=String(v||'');return(d.textContent||d.innerText||'').replace(/\s+/g,' ').trim();}function addPage(page){if(!page||seen.has(page.pageid)||!page.imageinfo?.[0])return;const i=page.imageinfo[0],m=i.extmetadata||{},title=String(page.title||'').replace(/^File:/,'');const license=plain(m.LicenseShortName?.value);const licenseUrl=safeUrl(m.LicenseUrl?.value)||'https://commons.wikimedia.org/';const artist=plain(m.Artist?.value)||plain(m.Credit?.value)||'Wikimedia Commons contributor';const desc=plain(m.ImageDescription?.value);const src=safeUrl(i.thumburl||i.url);if(!title||!src||!/CC ?BY|CC0|Public domain/i.test(license)||!/tesla/i.test(title+' '+desc))return;seen.add(page.pageid);found.push({title,src,source:safeUrl(i.descriptionurl)||'https://commons.wikimedia.org/',license,licenseUrl,artist,desc});}
    try{for(const q of queries){try{const url='https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent(q)+'&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=720&format=json&origin=*';const response=await fetch(url);if(response.ok){const json=await response.json();Object.values(json.query?.pages||{}).forEach(addPage);}}catch(_){}if(found.length>=50)break;}found.sort((a,b)=>a.title.localeCompare(b.title));box.replaceChildren();const cards=found.slice(0,50);cards.forEach(item=>{const card=document.createElement('article');card.className='panel gallery-card';card.dataset.search=(item.title+' '+item.artist+' '+item.desc).toLowerCase();const img=document.createElement('img');img.loading='lazy';img.src=item.src;img.alt=item.title.replace(/_/g,' ');img.referrerPolicy='no-referrer';img.addEventListener('error',()=>card.remove(),{once:true});const copy=document.createElement('div');copy.className='gallery-copy';const h=document.createElement('h3');h.textContent=item.title.replace(/_/g,' ');const p=document.createElement('p');p.textContent=item.desc.slice(0,140)||'Licensed Tesla vehicle photograph';const credit=document.createElement('p');credit.textContent='Photo: '+item.artist+' · '+item.license;const src=document.createElement('a');src.href=item.source;src.target='_blank';src.rel='noopener noreferrer';src.textContent='Source';const licence=document.createElement('a');licence.href=item.licenseUrl;licence.target='_blank';licence.rel='noopener noreferrer';licence.textContent='Licence';copy.append(h,p,credit,src,licence);card.append(img,copy);box.append(card);});setStatus('galleryStatus',cards.length?'Loaded '+cards.length+' freely licensed images. Photographer, source and licence details are shown with each photo.':'No licensed matches were returned. Try the public photo archive link below.');if(!cards.length){const link=document.createElement('a');link.href='https://commons.wikimedia.org/wiki/Category:Tesla_vehicles';link.target='_blank';link.rel='noopener noreferrer';link.className='primary-btn';link.textContent='Browse Tesla vehicle photos ↗';box.append(link);}}
    catch(error){state.galleryLoaded=false;setStatus('galleryStatus','The photo archive could not be reached right now. The featured model photos remain available above.');}}
  $('reloadGallery')?.addEventListener('click',()=>{state.galleryLoaded=false;$('teslaGallery').replaceChildren();loadTeslaGallery();});
  $('gallerySearch')?.addEventListener('input',event=>{const q=event.target.value.trim().toLowerCase();$$('#teslaGallery .gallery-card').forEach(card=>card.style.display=card.dataset.search.includes(q)?'block':'none');});

  async function start(){
    if(!config||!window.supabase){showToast('The app configuration is missing. Check supabase-config.js.');return;}
    try{state.db=window.supabase.createClient(config.url,config.publishableKey);}catch(error){showToast('Could not connect to the community database.');return;}
    $$('[data-page]').forEach(btn=>{if(btn.tagName==='BUTTON')btn.type='button';});
    loadMiniChart();
    const path=location.hash.replace(/^#/,'');const allowed=['home','explore','vehicles','markets','news','community','messages','saved','notifications','profile','learn'];
    let session=null;try{const result=await state.db.auth.getSession();session=result.data?.session||null;}catch(_){}
    state.user=session?.user||null;if(state.user)await ensureProfile(state.user);updateAuthDisplay();await loadSocialFeed('socialFeed',{filter:state.feedFilter,reset:true});await loadStories();
    state.db.auth.onAuthStateChange((event,sessionInfo)=>{state.user=sessionInfo?.user||null;setTimeout(()=>onAuthChange(state.user),0);if(event==='PASSWORD_RECOVERY'){openAuth('newpassword');}});
    if(allowed.includes(path))go(path);else if(location.hash&&location.hash.startsWith('#post-'))go('home');else loadNews('tesla',true);
    if(state.user){try{await loadNotificationsBadge();}catch(_){}}
    if(location.hash.startsWith('#post-')){setTimeout(()=>{const target=$(location.hash.slice(1));target?.scrollIntoView({behavior:'smooth',block:'center'});},180);}
    setInterval(()=>{if(!document.hidden&&state.user){loadNotificationsBadge().catch(()=>{});if(state.activePage==='messages'){loadConversations();if(state.activeConversation)loadConversationThread();}if(state.activePage==='community')loadCommunityChat();}if(!document.hidden&&state.activePage==='home')loadStories();},60000);
  }
  async function loadNotificationsBadge(){if(!state.user)return;const r=await state.db.from('social_notifications').select('id',{count:'exact',head:true}).eq('recipient_id',state.user.id).is('read_at',null);if(r.error)return;const badge=$('notificationBadge');badge.textContent=r.count>99?'99+':String(r.count||0);badge.classList.toggle('hidden',!r.count);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user){if(state.activePage==='notifications')loadNotifications();else loadNotificationsBadge();}});
  window.addEventListener('online',()=>showToast('You are back online.'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
