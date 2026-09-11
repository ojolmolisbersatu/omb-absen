function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function formatTanggalIndonesia(value){if(!value)return '-';const d=new Date(String(value).length===10?value+'T00:00:00':value);return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(d);}
function formatWaktu(value){if(!value)return '-';return String(value).slice(0,5);}
function showMessage(el,message,type='error'){if(!el)return;el.textContent=message;el.className='notice '+type;el.classList.remove('hidden');}
function setLoading(el,on,text='Memuat...'){if(!el)return;el.textContent=text;el.classList.toggle('hidden',!on);}
function isAdminSession(session){return !!(session?.user?.app_metadata?.role==='admin');}
async function requireAdmin(){const {data:{session}}=await window.supabaseClient.auth.getSession();if(!session){location.replace('login.html');return null;}if(!isAdminSession(session)){await window.supabaseClient.auth.signOut();location.replace('login.html?error=unauthorized');return null;}return session;}
async function logout(){await window.supabaseClient.auth.signOut();location.replace('login.html');}
function markActiveNav(){const file=(location.pathname.split('/').pop()||'index.html');document.querySelectorAll('.nav a, .bottom-nav a').forEach(a=>{const href=(a.getAttribute('href')||'').split('?')[0];a.classList.toggle('active',href===file);});}
document.addEventListener('DOMContentLoaded',markActiveNav);
window.escapeHtml=escapeHtml;window.formatTanggalIndonesia=formatTanggalIndonesia;window.formatWaktu=formatWaktu;window.showMessage=showMessage;window.setLoading=setLoading;window.requireAdmin=requireAdmin;window.logout=logout;window.markActiveNav=markActiveNav;
