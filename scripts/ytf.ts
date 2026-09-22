(async (): Promise<void> => {
  console.log('読み込めました');
  alert('読み込めました');
  
  const apiOrigin = 'https://ytf.neos21.workers.dev/api';
  
  try {
    const response = await fetch(`${apiOrigin}/test`);
    const text = await response.text();
    console.log(text);
    alert(text);
  }
  catch(error) {
    console.error(error);
    alert('GET 失敗 : ' + error);
  }
  
  try {
    const response = await fetch(`${apiOrigin}/test`, { method: 'POST' });
    const text = await response.text();
    console.log(text);
    alert(text);
  }
  catch(error) {
    console.error(error);
    alert('POST 失敗 : ' + error);
  }
})();
