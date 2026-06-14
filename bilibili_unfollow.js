// Bilibili批量取消关注脚本
// 使用方法：在Bilibili关注列表页面（space.bilibili.com/你的UID/relation/follow）
// 按F12打开控制台，复制粘贴此代码，按回车运行

(async function() {
    const vmid = '填写你的B站UID'; // 你的Bilibili UID，在个人主页URL中可以看到
    const csrf = '填写你的csrf_token'; // 从浏览器Cookie中的bili_jct字段获取
    const delay = 200; // 每个请求间隔200毫秒（避免风控）

    if (vmid.includes('填写') || csrf.includes('填写')) {
        console.error('请先填写你的UID和csrf_token后再运行！');
        return;
    }
    
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
                console.log(`[${i+1}/${allUids.length}] 取消关注成功 ${uid}`);
            } else {
                failed++;
                console.log(`[${i+1}/${allUids.length}] 取消关注失败 ${uid} - ${data.message}`);
            }
        } catch(e) {
            failed++;
            console.log(`[${i+1}/${allUids.length}] 网络错误 ${uid}`);
        }
        
        await new Promise(r => setTimeout(r, delay));
    }
    
    console.log(`【完成】成功: ${done}, 失败: ${failed}, 总计: ${allUids.length}`);
})();
