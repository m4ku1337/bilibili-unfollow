// Bilibili批量取消关注脚本
// 使用方法：在Bilibili关注列表页面（space.bilibili.com/你的UID/relation/follow）
// 按F12打开控制台，复制粘贴此代码，按回车运行

(async function() {
    const delay = 200; // 每个请求间隔200毫秒（避免风控）

    // 自动从Cookie获取CSRF和UID
    function getCookie(name) {
        let cookies = document.cookie.split('; ');
        for (let c of cookies) {
            if (c.startsWith(name + '=')) {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return null;
    }

    let csrf = getCookie('bili_jct');
    let vmid = getCookie('DedeUserID');

    if (!csrf || !vmid) {
        if (!csrf) console.warn('⚠ 未找到 bili_jct（CSRF Token），请确认已登录B站。');
        if (!vmid) console.warn('⚠ 未找到 DedeUserID（UID），请确认已登录B站。');
        console.log('💡 如需手动设置：在代码开头的"手动配置"区域填入你的 CSRF 和 UID');
        console.log('💡 CSRF获取方法：F12 → Application → Cookies → bilibili.com → 复制 bili_jct 的值');
        return;
    }

    console.log(`✅ 已自动获取 UID: ${vmid}`);
    console.log(`✅ 已自动获取 CSRF: ${csrf.substring(0, 8)}...（已隐藏大部分）`);

    // ---- 手动配置（自动获取失败时才需要填写）----
    // const csrf = '填写你的csrf_token';
    // const vmid = '填写你的B站UID';
    // -------------------------------------------
    
    console.log('【开始获取关注列表】');
    
    // 获取全部关注列表
    let allUids = [];
    let pn = 1;
    const ps = 50;
    
    while (true) {
        try {
            let res = await fetch(`https://api.bilibili.com/x/relation/followings?vmid=${vmid}&pn=${pn}&ps=${ps}&order_type=attention`, {
                credentials: 'include'
            });
            let data = await res.json();
            
            if (data.code !== 0 || !data.data || !data.data.list || data.data.list.length === 0) {
                break;
            }
            
            for (let u of data.data.list) {
                allUids.push(u.mid);
            }
            
            console.log(`已获取第${pn}页，当前共${allUids.length}个`);
            
            if (data.data.list.length < ps) break;
            pn++;
            if (pn > 40) break; // 安全上限
            
            await new Promise(r => setTimeout(r, delay));
        } catch(e) {
            console.error('获取失败:', e);
            break;
        }
    }
    
    console.log(`【获取完成】共${allUids.length}个关注`);
    console.log('【开始批量取消关注】');
    
    // 批量取消关注
    let done = 0;
    let failed = 0;
    let consecutiveFails = 0; // 连续失败计数

    for (let i = 0; i < allUids.length; i++) {
        let uid = allUids[i];
        try {
            let res = await fetch('https://api.bilibili.com/x/relation/modify', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                // act=2 表示取消关注 (1=关注, 2=取消关注); re_src=11 为关注列表页操作的来源标识
                body: `fid=${uid}&act=2&re_src=11&csrf=${csrf}`,
                credentials: 'include'
            });
            let data = await res.json();

            if (data.code === 0) {
                done++;
                consecutiveFails = 0; // 成功后重置
                console.log(`[${i+1}/${allUids.length}] 取消关注成功 ${uid}`);
            } else {
                failed++;
                consecutiveFails++;
                console.log(`[${i+1}/${allUids.length}] 取消关注失败 ${uid} - ${data.message}`);
            }
        } catch(e) {
            failed++;
            consecutiveFails++;
            console.log(`[${i+1}/${allUids.length}] 网络错误 ${uid}`);
        }

        if (consecutiveFails >= 10) {
            console.warn(`⚠ 已连续失败${consecutiveFails}次，建议：刷新网页后重新运行脚本，或调高 delay 值（当前${delay}ms，可改为500甚至1000）`);
        }

        await new Promise(r => setTimeout(r, delay));
    }

    console.log(`【完成】成功: ${done}, 失败: ${failed}, 总计: ${allUids.length}`);
})();
