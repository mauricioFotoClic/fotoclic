async function testHeaders() {
    const url = 'https://customer-7t6jbx4ml8cvuouh.cloudflarestream.com/b502a7f22da4b60e07f98bc4b5cd5ae6/downloads/default.mp4';
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log("Status:", res.status);
        console.log("Headers:");
        for (const [key, value] of res.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testHeaders();
