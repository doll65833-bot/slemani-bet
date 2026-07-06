// ========== ڕێکخستنەکان ==========
const TOKEN = "8966348154:AAHPi_S4iXA-OLSo5__Rb5o3Mx8VuLxGW6E";
const ADMIN_CHAT_ID = 8119964397;
const ZAINCHARG_NUMBER = "7870218371";
const MIN_DEPOSIT = 100000;
const MAX_DEPOSIT = 1000000;
const MIN_WITHDRAWAL = 25000;

export default {
  async fetch(request, env) {
    globalThis.SLEMANI_BET = env.SLEMANI_BET;
    const url = new URL(request.url);
    
    if (url.pathname === '/setup') {
      const webhookUrl = `${url.protocol}//${url.hostname}`;
      const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${webhookUrl}`);
      const d = await r.json();
      return new Response(JSON.stringify(d, null, 2), { headers: {'Content-Type': 'application/json'} });
    }
    
    if (request.method === 'POST') {
      const body = await request.json();
      await handleUpdate(body, env);
      return new Response('OK');
    }
    
    return new Response('🤖 سلێمانی بێت بۆت', { headers: {'Content-Type': 'text/plain; charset=utf-8'} });
  }
};

async function getKV(key) {
  const v = await SLEMANI_BET.get(key, {type:'json'});
  return v || null;
}
async function setKV(key, val) {
  await SLEMANI_BET.put(key, JSON.stringify(val));
}

async function send(chatId, text, opt={}) {
  const p = {chat_id: chatId, text, parse_mode: 'HTML', ...opt};
  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)});
}

async function edit(chatId, msgId, text, opt={}) {
  const p = {chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...opt};
  return fetch(`https://api.telegram.org/bot${TOKEN}/editMessageText`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)});
}

async function handleUpdate(update, env) {
  const msg = update.message;
  const cb = update.callback_query;
  
  if (msg && msg.text === '/start') {
    const user = msg.from;
    await setKV(`user_${user.id}`, {id:user.id, name:user.first_name, username:user.username||'', balance:0, total_deposit:0, total_withdrawal:0, joined:new Date().toISOString()});
    
    const kbd = {inline_keyboard: [
      [{text:'🎮 یارییەکان', callback_data:'games'}],
      [{text:'💰 پارە داخڵ کردن', callback_data:'deposit'}],
      [{text:'💸 ڕاکێشان', callback_data:'withdraw'}],
      [{text:'👤 ئەکاونتی من', callback_data:'profile'}],
      [{text:'📞 پشتگیری', callback_data:'support'}]
    ]};
    
    await send(msg.chat.id, `<b>🎲 بەخێربێیت بۆ سلێمانی بێت!</b>\n\n${user.first_name}ی خۆشەویست، بەخێربێیت!\n\n<b>🤑 بۆنوسی تایبەت:</b>\nیەکەم پارە داخڵ کردن %150 بۆنوس\nنموونە: 100,000 = 250,000 دینار\n\n<b>💳 ڕێگاکان:</b> کارتی ئاسیا، زەین کاش، کۆڕەک، زیچارج (${ZAINCHARG_NUMBER})\n\n<b>💰 ڕاکێشان:</b> کەمترین ${MIN_WITHDRAWAL.toLocaleString()} دینار`, {reply_markup: JSON.stringify(kbd)});
  }
  
  if (msg && msg.text === '/admin' && msg.from.id === ADMIN_CHAT_ID) {
    const kbd = {inline_keyboard: [
      [{text:'👥 بەکارهێنەران', callback_data:'admin_users'}],
      [{text:'📊 ئامارەکان', callback_data:'admin_stats'}],
      [{text:'⏳ چاوەڕوانەکان', callback_data:'admin_pending'}]
    ]};
    await send(msg.chat.id, '<b>⚙️ پانێڵی ئەدمین</b>', {reply_markup: JSON.stringify(kbd)});
  }
  
  // داواکاری پارە داخڵ کردن
  const depState = await getKV(`dep_${msg?.from?.id}`);
  if (msg && depState && msg.text) {
    const amount = parseInt(msg.text.replace(/,/g, ''));
    if (isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      return send(msg.chat.id, `⚠️ بڕێکی ڕاست بنووسە (${MIN_DEPOSIT.toLocaleString()} - ${MAX_DEPOSIT.toLocaleString()})`);
    }
    
    const userData = await getKV(`user_${msg.from.id}`);
    const isFirst = (userData?.total_deposit || 0) === 0;
    const txId = Date.now();
    
    let txList = await getKV('transactions') || [];
    txList.push({id:txId, user_id:msg.from.id, type:'deposit', amount, method:depState.method, status:'pending', date:new Date().toISOString()});
    await setKV('transactions', txList);
    await setKV(`dep_${msg.from.id}`, null);
    
    const adminKbd = {inline_keyboard: [[
      {text:'✅ پەسندکردن', callback_data:`approve_${txId}_${msg.from.id}_${amount}`},
      {text:'❌ ڕەتکردنەوە', callback_data:`reject_${txId}_${msg.from.id}`}
    ]]};
    
    await send(ADMIN_CHAT_ID, `🔔 <b>داوای پارە داخڵ کردن!</b>\n\n👤 @${msg.from.username||''} | ${msg.from.first_name}\n🆔 <code>${msg.from.id}</code>\n💵 ${amount.toLocaleString()} دینار\n💳 ${depState.method}\n🆔 TX-${txId}`, {reply_markup: JSON.stringify(adminKbd)});
    
    let txt = `✅ داوا نێردرا!\nبڕ: ${amount.toLocaleString()} دینار\nڕێگا: ${depState.method}\nناسنامە: TX-${txId}\n\n⏳ چاوەڕوانی پەسندکردن...`;
    if (isFirst) txt += `\n\n🎁 بۆنوس: ${amount.toLocaleString()} + %150 = ${Math.floor(amount*1.5).toLocaleString()}`;
    
    return send(msg.chat.id, txt);
  }
  
  // داواکاری ڕاکێشان
  const wdState = await getKV(`wd_${msg?.from?.id}`);
  if (msg && wdState && msg.text) {
    const amount = parseInt(msg.text.replace(/,/g, ''));
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      return send(msg.chat.id, `⚠️ کەمترین ڕاکێشان ${MIN_WITHDRAWAL.toLocaleString()} دینارە`);
    }
    
    const userData = await getKV(`user_${msg.from.id}`);
    if (!userData || amount > (userData.balance || 0)) {
      return send(msg.chat.id, `⚠️ باڵانسی تۆ ${(userData?.balance||0).toLocaleString()} دینارە`);
    }
    
    const txId = Date.now();
    let txList = await getKV('transactions') || [];
    txList.push({id:txId, user_id:msg.from.id, type:'withdraw', amount, method:wdState.method, status:'pending', date:new Date().toISOString()});
    await setKV('transactions', txList);
    await setKV(`wd_${msg.from.id}`, null);
    
    const adminKbd = {inline_keyboard: [[
      {text:'✅ پەسندکردن', callback_data:`approve_wd_${txId}_${msg.from.id}_${amount}`},
      {text:'❌ ڕەتکردنەوە', callback_data:`reject_${txId}_${msg.from.id}`}
    ]]};
    
    await send(ADMIN_CHAT_ID, `🔔 <b>داوای ڕاکێشان!</b>\n\n👤 @${msg.from.username||''} | ${msg.from.first_name}\n🆔 <code>${msg.from.id}</code>\n💵 ${amount.toLocaleString()} دینار\n💳 ${wdState.method}\n🆔 TX-${txId}`, {reply_markup: JSON.stringify(adminKbd)});
    
    return send(msg.chat.id, `✅ داوا نێردرا!\nبڕ: ${amount.toLocaleString()} دینار\nناسنامە: TX-${txId}\n\n⏳ چاوەڕوانی پەسندکردن...`);
  }
  
  // Callback queries
  if (cb) {
    const data = cb.data;
    const chatId = cb.message.chat.id;
    const msgId = cb.message.message_id;
    const userId = cb.from.id;
    
    await answerCallback(cb.id);
    
    if (data === 'games') {
      const kbd = {inline_keyboard: [[{text:'🔙 گەڕانەوە', callback_data:'main_menu'}]]};
      return edit(chatId, msgId, '<b>🎮 یارییەکان</b>\n\n⚽ تۆپی پێ\n🏀 تۆپی سەبەتە\n🎾 تێنس\n🎰 سڵۆت\n🃏 پۆکەر\n🎡 ڕولێت\n⚡ ئی سپۆرت\n\n⚠️ یارییەکان ناکرێنەوە', {reply_markup: JSON.stringify(kbd)});
    }
    
    if (data === 'main_menu') {
      const kbd = {inline_keyboard: [
        [{text:'🎮 یارییەکان', callback_data:'games'}],
        [{text:'💰 پارە داخڵ کردن', callback_data:'deposit'}],
        [{text:'💸 ڕاکێشان', callback_data:'withdraw'}],
        [{text:'👤 ئەکاونتی من', callback_data:'profile'}],
        [{text:'📞 پشتگیری', callback_data:'support'}]
      ]};
      return edit(chatId, msgId, '<b>🎲 سلێمانی بێت - مێنیوی سەرەکی</b>', {reply_markup: JSON.stringify(kbd)});
    }
    
    if (data === 'deposit') {
      const kbd = {inline_keyboard: [
        [{text:'💳 کارتی ئاسیا', callback_data:'dep_asia'}],
        [{text:'📱 زەین کاش', callback_data:'dep_zain'}],
        [{text:'🏦 کۆڕەک', callback_data:'dep_korek'}],
        [{text:'📲 زیچارج', callback_data:'dep_zaincharg'}],
        [{text:'🔙 گەڕانەوە', callback_data:'main_menu'}]
      ]};
      return edit(chatId, msgId, `<b>💰 پارە داخڵ کردن</b>\n\n🎁 %150 بۆنوس!\nنموونە: 100,000 = 250,000\n\n📱 زیچارج: ${ZAINCHARG_NUMBER}\n\n<b>کەمترین:</b> ${MIN_DEPOSIT.toLocaleString()}\n<b>زۆرترین:</b> ${MAX_DEPOSIT.toLocaleString()}`, {reply_markup: JSON.stringify(kbd)});
    }
    
    if (data.startsWith('dep_')) {
      const methods = {dep_asia:'کارتی ئاسیا', dep_zain:'زەین کاش', dep_korek:'کۆڕەک', dep_zaincharg:'زیچارج'};
      const method = methods[data] || '';
      
      if (data === 'dep_zaincharg') {
        return edit(chatId, msgId, `<b>📲 زیچارج</b>\n\nپارە بنێرە بۆ:\n<code>${ZAINCHARG_NUMBER}</code>\n\nدوای ناردن، نامە بۆ ئەدمین بنێرە`, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'deposit'}]]})});
      }
      
      await setKV(`dep_${userId}`, {method});
      await send(userId, `<b>${method}</b>\n\nبڕی پارەکە بنووسە (بە دینار)\nکەمترین: ${MIN_DEPOSIT.toLocaleString()}\nزۆرترین: ${MAX_DEPOSIT.toLocaleString()}`);
      return edit(chatId, msgId, `⏳ بڕەکە بنووسە...`, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'deposit'}]]})});
    }
    
    if (data === 'withdraw') {
      const kbd = {inline_keyboard: [
        [{text:'💳 کارتی ئاسیا', callback_data:'wd_asia'}],
        [{text:'📱 زەین کاش', callback_data:'wd_zain'}],
        [{text:'🏦 کۆڕەک', callback_data:'wd_korek'}],
        [{text:'📲 زیچارج', callback_data:'wd_zaincharg'}],
        [{text:'🔙 گەڕانەوە', callback_data:'main_menu'}]
      ]};
      return edit(chatId, msgId, `<b>💸 ڕاکێشان</b>\n\nکەمترین: ${MIN_WITHDRAWAL.toLocaleString()} دینار\n⏳ 24-48 کاتژمێر`, {reply_markup: JSON.stringify(kbd)});
    }
    
    if (data.startsWith('wd_')) {
      const methods = {wd_asia:'کارتی ئاسیا', wd_zain:'زەین کاش', wd_korek:'کۆڕەک', wd_zaincharg:'زیچارج'};
      const method = methods[data] || '';
      await setKV(`wd_${userId}`, {method});
      await send(userId, `<b>${method} - ڕاکێشان</b>\n\nبڕەکە بنووسە\nکەمترین: ${MIN_WITHDRAWAL.toLocaleString()}`);
      return edit(chatId, msgId, '⏳ بڕی ڕاکێشانەکە بنووسە...', {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'withdraw'}]]})});
    }
    
    if (data === 'profile') {
      const u = await getKV(`user_${userId}`);
      if (!u) return edit(chatId, msgId, '⚠️ نەدۆزرایەوە');
      const kbd = {inline_keyboard: [[{text:'🔙 گەڕانەوە', callback_data:'main_menu'}]]};
      return edit(chatId, msgId, `<b>👤 ئەکاونتی تۆ</b>\n\nنازناو: ${u.name}\nیوزەرنەیم: @${u.username}\n\n💰 باڵانس: <code>${(u.balance||0).toLocaleString()}</code> دینار\n📥 پارە داخڵ: ${(u.total_deposit||0).toLocaleString()}\n📤 ڕاکێشان: ${(u.total_withdrawal||0).toLocaleString()}\n📅 لە: ${u.joined}`, {reply_markup: JSON.stringify(kbd)});
    }
    
    if (data === 'support') {
      return edit(chatId, msgId, `<b>📞 پشتگیری</b>\n\n✉️ @slemani_admin\n💳 ${ZAINCHARG_NUMBER}`, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'main_menu'}]]})});
    }
    
    // ئەدمین
    if (data === 'admin_users' && userId === ADMIN_CHAT_ID) {
      const keys = await SLEMANI_BET.list({prefix:'user_'});
      let txt = '<b>👥 بەکارهێنەران:</b>\n\n';
      for (const k of keys.keys) {
        const u = await getKV(k.name);
        if (u) txt += `🆔 ${u.id} | ${u.name} | @${u.username} | 💰 ${(u.balance||0).toLocaleString()}\n`;
      }
      return edit(chatId, msgId, txt, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'admin_back'}]]})});
    }
    
    if (data === 'admin_stats' && userId === ADMIN_CHAT_ID) {
      const keys = await SLEMANI_BET.list({prefix:'user_'});
      let count = 0, bal = 0, dep = 0, wd = 0;
      for (const k of keys.keys) {
        const u = await getKV(k.name);
        if (u) { count++; bal += u.balance||0; dep += u.total_deposit||0; wd += u.total_withdrawal||0; }
      }
      return edit(chatId, msgId, `<b>📊 ئامارەکان</b>\n\n👥 گشتی: ${count}\n💰 باڵانس: ${bal.toLocaleString()}\n📥 پارە داخڵ: ${dep.toLocaleString()}\n📤 ڕاکێشان: ${wd.toLocaleString()}`, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'admin_back'}]]})});
    }
    
    if (data === 'admin_pending' && userId === ADMIN_CHAT_ID) {
      const txList = await getKV('transactions') || [];
      const pending = txList.filter(t => t.status === 'pending');
      if (pending.length === 0) return edit(chatId, msgId, '✅ هیچ چاوەڕوانێک نییە', {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'admin_back'}]]})});
      let txt = '<b>⏳ چاوەڕوانەکان:</b>\n\n';
      for (const p of pending) {
        txt += `TX-${p.id} | ${p.type==='deposit'?'📥':'📤'} ${p.amount.toLocaleString()} | ${p.method}\n`;
      }
      return edit(chatId, msgId, txt, {reply_markup: JSON.stringify({inline_keyboard:[[{text:'🔙 گەڕانەوە', callback_data:'admin_back'}]]})});
    }
    
    if (data === 'admin_back' && userId === ADMIN_CHAT_ID) {
      const kbd = {inline_keyboard: [
        [{text:'👥 بەکارهێنەران', callback_data:'admin_users'}],
        [{text:'📊 ئامارەکان', callback_data:'admin_stats'}],
        [{text:'⏳ چاوەڕوانەکان', callback_data:'admin_pending'}]
      ]};
      return edit(chatId, msgId, '<b>⚙️ پانێڵی ئەدمین</b>', {reply_markup: JSON.stringify(kbd)});
    }
    
    // پەسندکردن/ڕەتکردنەوە
    if (data.startsWith('approve_') || data.startsWith('reject_') || data.startsWith('approve_wd_')) {
      if (userId !== ADMIN_CHAT_ID) return;
      const parts = data.split('_');
      const action = parts[0];
      const txId = parseInt(parts[1]);
      
      let txList = await getKV('transactions') || [];
      const tx = txList.find(t => t.id === txId);
      if (!tx) return;
      
      if (action === 'approve') {
        tx.status = 'approved';
        const targetId = parseInt(parts[2]);
        const amount = parseInt(parts[3]);
        const u = await getKV(`user_${targetId}`);
        const isFirst = (u?.total_deposit||0) === 0;
        const finalAmt = isFirst ? Math.floor(amount * 1.5) : amount;
        if (u) {
          u.balance = (u.balance||0) + finalAmt;
          u.total_deposit = (u.total_deposit||0) + amount;
          await setKV(`user_${targetId}`, u);
        }
        await setKV('transactions', txList);
        await edit(chatId, msgId, `✅ TX-${txId} پەسندکرا! ${amount.toLocaleString()} دینار`);
        let bt = isFirst ? `\n\n🎁 بۆنوس %150: ${amount.toLocaleString()} + ${Math.floor(amount*0.5).toLocaleString()} = ${finalAmt.toLocaleString()}` : '';
        return send(targetId, `✅ <b>پارە داخڵ پەسندکرا!</b>\n\n${amount.toLocaleString()} دینار\nTX-${txId}${bt}`);
      }
      
      if (action === 'approve_wd') {
        tx.status = 'approved';
        const targetId = parseInt(parts[2]);
        const amount = parseInt(parts[3]);
        const u = await getKV(`user_${targetId}`);
        if (u) {
          u.balance = (u.balance||0) - amount;
          u.total_withdrawal = (u.total_withdrawal||0) + amount;
          await setKV(`user_${targetId}`, u);
        }
        await setKV('transactions', txList);
        await edit(chatId, msgId, `✅ ڕاکێشان TX-${txId} پەسندکرا!`);
        return send(targetId, `✅ <b>ڕاکێشان پەسندکرا!</b>\n\n${amount.toLocaleString()} دینار\nTX-${txId}\n⏳ تا 48 کاتژمێر`);
      }
      
      if (action === 'reject') {
        tx.status = 'rejected';
        const targetId = parseInt(parts[2]);
        await setKV('transactions', txList);
        await edit(chatId, msgId, `❌ TX-${txId} ڕەتکرایەوە!`);
        return send(targetId, `❌ <b>ڕەتکرایەوە!</b>\nTX-${txId}`);
      }
    }
  }
}

async function answerCallback(id) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({callback_query_id: id})
  });
                                                                                                                                                   }
