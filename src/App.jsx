import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, Sparkles, Twitter, Instagram, Heart, Shuffle, Loader, Crown, User, LogOut, Lock, Zap } from 'lucide-react';

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://omfjfnzkmrglzaytdzls.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZmpmbnprbXJnbHpheXRkemxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Mzc4OTMsImV4cCI6MjA3NTMxMzg5M30.tIzUZ3VxD8fynL3JZJ7zGqOIamYQZ5Wn-eCCfv7ud2M';

const BACKGROUNDS = [
  { id: 1, name: 'Sunset', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', premium: false },
  { id: 2, name: 'Ocean', css: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)', premium: false },
  { id: 3, name: 'Blossom', css: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', premium: false },
  { id: 4, name: 'Night', css: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', premium: false },
  { id: 5, name: 'Gold', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', premium: true },
  { id: 6, name: 'Emerald', css: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)', premium: true },
  { id: 7, name: 'Fire', css: 'linear-gradient(135deg, #FF512F 0%, #F09819 100%)', premium: true },
  { id: 8, name: 'Aurora', css: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', premium: true },
];

const FONTS = [
  { id: 1, name: 'Classic', css: 'Georgia, serif', premium: false },
  { id: 2, name: 'Modern', css: 'Inter, sans-serif', premium: false },
  { id: 3, name: 'Bold', css: 'Impact, sans-serif', premium: true },
];

// ==================== SERVICES ====================
const db = {
  async query(table, columns = '*', filters = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
    Object.entries(filters).forEach(([k, v]) => url += `&${k}=eq.${v}`);
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, ...(token && { 'Authorization': `Bearer ${token}` }) }});
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  },
  async insert(table, data) {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async delete(table, filters) {
    const token = localStorage.getItem('auth_token');
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    Object.entries(filters).forEach(([k, v]) => url += `${k}=eq.${v}&`);
    await fetch(url, { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, ...(token && { 'Authorization': `Bearer ${token}` }) }});
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('user_email', data.user.email);
    }
    return data;
  },
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }
};

// ==================== MAIN COMPONENT ====================
export default function AnimeQuoteStudio() {
  const [view, setView] = useState('landing');
  const [authView, setAuthView] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({ total: 20, downloads: 0, views: 0 });
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [font, setFont] = useState(FONTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');
    if (userId) {
      setUser({ id: userId, email });
      loadUserData(userId);
    }
    loadStats();
  }, []);

  const loadUserData = async (userId) => {
    const [profiles, favs] = await Promise.all([
      db.query('user_profiles', '*', { id: userId }),
      db.query('user_favorites', 'quote_id', { user_id: userId })
    ]);
    setProfile(profiles[0]);
    setFavorites(favs.map(f => f.quote_id));
  };

  const loadStats = async () => {
    const quotes = await db.query('quotes', 'id,view_count,download_count');
    setStats({
      total: quotes.length,
      downloads: quotes.reduce((s, q) => s + (q.download_count || 0), 0),
      views: quotes.reduce((s, q) => s + (q.view_count || 0), 0)
    });
  };

  const handleAuth = async (email, password, isSignUp) => {
    setIsLoading(true);
    try {
      const data = isSignUp ? await db.signUp(email, password) : await db.signIn(email, password);
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        setAuthView(null);
        await loadUserData(data.user.id);
      } else {
        alert(data.error?.message || 'Auth failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setView('landing');
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setView('search');
    const quotes = await db.query('quotes', 'id,quote_text,episode_number,emotion,view_count,download_count,characters(name),anime(title)');
    const formatted = quotes.map(q => ({
      ...q,
      character: { name: q.characters?.name || 'Unknown' },
      anime: { title: q.anime?.title || 'Unknown' }
    }));
    setSearchResults(searchQuery ? formatted.filter(q => 
      q.quote_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.character.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : formatted.slice(0, 20));
    setIsLoading(false);
  };

  const selectQuote = async (q) => {
    setSelectedQuote(q);
    setView('generator');
    await db.update('quotes', q.id, { view_count: (q.view_count || 0) + 1 });
  };

  const randomQuote = async () => {
    setIsLoading(true);
    const quotes = await db.query('quotes', 'id,quote_text,episode_number,emotion,characters(name),anime(title)');
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    setSelectedQuote({ ...random, character: { name: random.characters?.name }, anime: { title: random.anime?.title }});
    setView('generator');
    setIsLoading(false);
  };

  const toggleFavorite = async (qid) => {
    if (!user) return setAuthView('signin');
    if (favorites.includes(qid)) {
      await db.delete('user_favorites', { user_id: user.id, quote_id: qid });
      setFavorites(favorites.filter(id => id !== qid));
    } else {
      await db.insert('user_favorites', { user_id: user.id, quote_id: qid });
      setFavorites([...favorites, qid]);
    }
  };

  const downloadImage = async () => {
    if (!user) return setAuthView('signin');
    if (profile?.subscription_tier !== 'premium' && profile?.downloads_today >= 5) {
      setDownloadLimit('Daily limit reached (5/day). Upgrade to Premium!');
      return setShowPricing(true);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 630;

    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    const colors = background.css.match(/#[0-9a-f]{6}/gi) || ['#667eea', '#764ba2'];
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = 'white';
    ctx.font = `bold 48px ${font.css}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;

    const words = selectedQuote.quote_text.split(' ');
    let line = '', y = 250;
    words.forEach(w => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > 1000 && line) {
        ctx.fillText(line, 600, y);
        line = w + ' ';
        y += 60;
      } else {
        line = test;
      }
    });
    ctx.fillText(line, 600, y);
    ctx.font = '32px Inter';
    ctx.fillText(`— ${selectedQuote.character.name}`, 600, y + 100);
    ctx.font = '24px Inter';
    ctx.fillText(selectedQuote.anime.title, 600, y + 140);

    if (profile?.subscription_tier !== 'premium') {
      ctx.font = '16px Inter';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('AnimeQuoteStudio.com', 600, y + 180);
    }

    const link = document.createElement('a');
    link.download = `quote-${selectedQuote.id}.png`;
    link.href = canvas.toDataURL();
    link.click();

    await db.update('quotes', selectedQuote.id, { download_count: (selectedQuote.download_count || 0) + 1 });
    await db.update('user_profiles', user.id, { downloads_today: (profile.downloads_today || 0) + 1 });
    await loadUserData(user.id);
    await loadStats();
  };

  const isPremium = profile?.subscription_tier === 'premium';

  // AUTH VIEW
  if (authView) {
    const isSignUp = authView === 'signup';
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-6">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(e.target.email.value, e.target.password.value, isSignUp); }}>
            <input name="email" type="email" required placeholder="your@email.com" className="w-full px-4 py-3 mb-4 border-2 rounded-lg focus:border-purple-600 outline-none" />
            <input name="password" type="password" required minLength="6" placeholder="Password" className="w-full px-4 py-3 mb-6 border-2 rounded-lg focus:border-purple-600 outline-none" />
            <button type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50">
              {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          <button onClick={() => setAuthView(isSignUp ? 'signin' : 'signup')} className="w-full mt-4 text-purple-600">{isSignUp ? 'Sign in' : 'Sign up'}</button>
          <button onClick={() => setAuthView(null)} className="w-full mt-2 text-gray-600">← Back</button>
        </div>
      </div>
    );
  }

  // PRICING VIEW
  if (showPricing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-purple-600 text-white p-4">
          <div className="container mx-auto flex justify-between">
            <h1 className="text-2xl font-bold">Anime Quote Studio</h1>
            <button onClick={() => setShowPricing(false)} className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold">← Back</button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-4">Upgrade to Premium</h2>
          <p className="text-xl text-gray-600 text-center mb-12">Unlimited downloads, HD quality, no watermarks</p>
          {downloadLimit && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto mb-8 text-yellow-800">{downloadLimit}</div>}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-600">/mo</span></div>
              <ul className="space-y-3 mb-8"><li>✓ 5 downloads/day</li><li>✓ Basic backgrounds</li><li className="text-gray-400">✗ Watermark</li></ul>
              <div className="text-center text-gray-600 font-semibold">Current Plan</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl shadow-2xl p-8 text-white relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-purple-900 px-4 py-1 rounded-full font-bold text-sm">BEST VALUE</div>
              <div className="flex items-center gap-2 mb-4"><Crown size={32} /><h3 className="text-2xl font-bold">Premium</h3></div>
              <div className="text-4xl font-bold mb-2">$4.99<span className="text-lg opacity-80">/mo</span></div>
              <p className="text-sm opacity-80 mb-6">or $39.99/year (save 33%)</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2"><Zap size={20} className="text-yellow-300" /> Unlimited downloads</li>
                <li className="flex items-center gap-2"><Sparkles size={20} className="text-yellow-300" /> Premium backgrounds</li>
                <li className="flex items-center gap-2"><Crown size={20} className="text-yellow-300" /> No watermarks</li>
              </ul>
              <button className="w-full bg-white text-purple-600 py-4 rounded-lg font-bold text-lg hover:scale-105 transition">Upgrade Now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LANDING
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">✨ Anime Quote Studio</h1>
            <div className="flex gap-2">
              {user ? (
                <>
                  <div className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    {isPremium ? <Crown size={20} className="text-yellow-300" /> : <User size={20} />}
                    {user.email?.split('@')[0]}
                    {!isPremium && profile && <span className="text-xs">({profile.downloads_today}/5)</span>}
                  </div>
                  <button onClick={handleSignOut} className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg"><LogOut size={20} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setAuthView('signin')} className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold">Sign In</button>
                  <button onClick={() => setAuthView('signup')} className="bg-purple-900 text-white px-6 py-2 rounded-lg font-semibold">Sign Up</button>
                </>
              )}
            </div>
          </div>
          <div className="text-center text-white mb-12">
            <h2 className="text-6xl font-bold mb-4">Create & Share Anime Quotes</h2>
            <p className="text-2xl mb-8">Search, Customize & Download</p>
            <p className="text-lg mb-8 opacity-90">{stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={() => setView('search')} className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg">🔍 Start</button>
              <button onClick={randomQuote} disabled={isLoading} className="bg-purple-900 text-white px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg flex items-center gap-2">
                {isLoading ? <Loader className="animate-spin" size={24} /> : <Shuffle size={24} />} Random
              </button>
              {!isPremium && <button onClick={() => setShowPricing(true)} className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg flex items-center gap-2"><Crown size={24} /> Premium</button>}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition"><Search size={48} className="mb-4 mx-auto" /><h3 className="text-xl font-bold mb-2">{stats.total}+ Quotes</h3><p>Search by anime, character</p></div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition"><Sparkles size={48} className="mb-4 mx-auto" /><h3 className="text-xl font-bold mb-2">Customize</h3><p>8 backgrounds, 3 fonts</p></div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition"><Download size={48} className="mb-4 mx-auto" /><h3 className="text-xl font-bold mb-2">Share</h3><p>Perfect for social media</p></div>
          </div>
        </div>
      </div>
    );
  }

  // SEARCH
  if (view === 'search') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-purple-600 text-white p-4">
          <div className="container mx-auto flex justify-between">
            <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setView('landing')}>Anime Quote Studio</h1>
            <button onClick={randomQuote} disabled={isLoading} className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">{isLoading ? <Loader className="animate-spin" size={20} /> : <Shuffle size={20} />}</button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto mb-8 flex gap-2">
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 px-4 py-3 rounded-lg border-2 focus:border-purple-600 outline-none" />
            <button onClick={handleSearch} disabled={isLoading} className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold">{isLoading ? <Loader className="animate-spin" size={24} /> : <Search size={24} />}</button>
          </div>
          {isLoading ? (
            <div className="text-center py-12"><Loader className="animate-spin mx-auto mb-4 text-purple-600" size={48} /><p className="text-gray-600">Searching...</p></div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-600 text-xl mb-4">Click search!</p><button onClick={handleSearch} className="bg-purple-600 text-white px-6 py-3 rounded-lg">Show All</button></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {searchResults.map(q => (
                <div key={q.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition border-2 hover:border-purple-400">
                  <div className="flex justify-between mb-4">
                    <p className="text-xl italic flex-1 cursor-pointer" onClick={() => selectQuote(q)}>"{q.quote_text}"</p>
                    <button onClick={() => toggleFavorite(q.id)} className={favorites.includes(q.id) ? 'text-red-500' : 'text-gray-400'}><Heart size={24} fill={favorites.includes(q.id) ? 'currentColor' : 'none'} /></button>
                  </div>
                  <div className="cursor-pointer" onClick={() => selectQuote(q)}>
                    <p className="font-semibold text-purple-600">{q.character.name}</p>
                    <p className="text-sm text-gray-600">{q.anime.title} • Ep {q.episode_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // GENERATOR
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setView('landing')}>Anime Quote Studio</h1>
          <button onClick={() => setView('search')} className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold">← Back</button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold mb-4">Preview</h2>
            <div className="rounded-xl shadow-2xl aspect-video flex items-center justify-center p-8" style={{ background: background.css }}>
              <div className="text-center">
                <p className="text-white text-3xl font-bold mb-6 drop-shadow-lg" style={{ fontFamily: font.css }}>"{selectedQuote.quote_text}"</p>
                <p className="text-white text-xl drop-shadow-lg">— {selectedQuote.character.name}</p>
                <p className="text-white/80 text-lg drop-shadow-lg">{selectedQuote.anime.title}</p>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Customize</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
              <h3 className="font-semibold mb-3">Background</h3>
              <div className="grid grid-cols-4 gap-3">
                {BACKGROUNDS.map(bg => (
                  <button key={bg.id} onClick={() => bg.premium && !isPremium ? setShowPricing(true) : setBackground(bg)} className={`h-16 rounded-lg border-4 hover:scale-110 transition relative ${background.id === bg.id ? 'border-purple-600' : 'border-gray-200'}`} style={{ background: bg.css }}>
                    {bg.premium && !isPremium && <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center"><Lock size={20} className="text-yellow-300" /></div>}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
              <h3 className="font-semibold mb-3">Font</h3>
              <div className="flex gap-3">
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => f.premium && !isPremium ? setShowPricing(true) : setFont(f)} className={`flex-1 py-3 rounded-lg border-2 transition relative ${font.id === f.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`} style={{ fontFamily: f.css }}>
                    {f.name}
                    {f.premium && !isPremium && <Lock size={16} className="absolute top-1 right-1 text-yellow-500" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={downloadImage} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 flex items-center justify-center gap-2"><Download size={24} /> Download</button>
            {user && !isPremium && profile && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 text-center">{profile.downloads_today}/5 downloads today • <button onClick={() => setShowPricing(true)} className="font-semibold underline">Upgrade for unlimited</button></p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-600"><Twitter size={20} /> Twitter</button>
              <button className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-pink-600"><Instagram size={20} /> Instagram</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
