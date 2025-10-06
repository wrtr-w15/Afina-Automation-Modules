
// Import module functions
const { replacePlaceholders, delay, connectToBrowser, getCurrentPage } = require('./utils_185.js');

// The module contains an asynchronous function
const moduleFunction = (async function (element, savedObjects, connections, elementMap, currentElementId, uuid, port, wsEndpoint) {
    // Create a simple logger that sends messages up
    const logger = {
      info: (message) => process.send({ type: 'log', level: 'info', message }),
      error: (message) => process.send({ type: 'log', level: 'error', message }),
      warn: (message) => process.send({ type: 'log', level: 'warn', message }),
      debug: (message) => process.send({ type: 'log', level: 'debug', message })
    };
    
    // Connect to the browser through WebSocket
    const browser = await connectToBrowser(wsEndpoint);
    const page = await getCurrentPage(browser);
    
  function def(v,d){return v!==undefined&&v!==null&&v!==""?v:d}
  function n(v,d){const x=Number(def(v,d));return Number.isFinite(x)?x:d}
  function clampMin(x,m){return x<m?m:x}
  function rangeFix(min,max){return min<=max?[min,max]:[max,min]}
  function rnd(min,max){return Math.floor(Math.random()*(max-min+1))+min}
  async function press(k){await page.evaluate((x)=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:x,code:x,bubbles:true}))},k)}

  const selectorType = def(element.settings.selectorType,"xpath")==="xpath"?"xpath":"css";
  const selector = selectorType==="xpath"
    ? `::-p-xpath(${def(element.settings.xpath,'//canvas[@width="512" and @height="512"]')})`
    : def(element.settings.cssSelector,"");
  const clickToFocus = !!def(element.settings.clickToFocus,true);

  let [lineMin,lineMax] = rangeFix(clampMin(n(element.settings.lineTimeMinMs,800),1), clampMin(n(element.settings.lineTimeMaxMs,1200),1));
  let [shiftMin,shiftMax] = rangeFix(clampMin(n(element.settings.shiftTimeMinMs,120),1), clampMin(n(element.settings.shiftTimeMaxMs,220),1));
  const maxDurationMs = clampMin(n(element.settings.maxDurationMs,60000),1);
  const saveTo = def(element.settings.saveTo,"snakeResult").trim();

  const canvasHandle = await page.$(selector);
  if(!canvasHandle){throw new Error(`Snake Player: canvas not found: ${selector}`)}
  if(clickToFocus){await canvasHandle.click()}

  const startAt = Date.now();
  const until = startAt + maxDurationMs;

  let segments=0, turns=0, lastDir=null;
  async function goFor(dir,ms){
    if(signal&&signal.aborted) return false;
    if(lastDir!==dir){await press(dir); turns++; lastDir=dir}
    const end = Date.now()+ms;
    while(Date.now()<end){
      if(signal&&signal.aborted) return false;
      const left = end - Date.now();
      await delay(left>50?50:left);
    }
    segments++;
    return true;
  }

  let up="ArrowUp", down="ArrowDown", right="ArrowRight";
  let ok=true;

  while(Date.now()<until && ok){
    let t1 = rnd(lineMin,lineMax);
    if(Date.now()+t1>until) t1 = Math.max(1, until - Date.now());
    ok = await goFor(up, t1); if(!ok) break;
    let s1 = rnd(shiftMin,shiftMax);
    if(Date.now()+s1>until) s1 = Math.max(1, until - Date.now());
    ok = await goFor(right, s1); if(!ok) break;

    let t2 = rnd(lineMin,lineMax);
    if(Date.now()+t2>until) t2 = Math.max(1, until - Date.now());
    ok = await goFor(down, t2); if(!ok) break;
    let s2 = rnd(shiftMin,shiftMax);
    if(Date.now()+s2>until) s2 = Math.max(1, until - Date.now());
    ok = await goFor(right, s2); if(!ok) break;
  }

  savedObjects[saveTo] = {
    status: "done",
    startedAt: startAt,
    finishedAt: Date.now(),
    maxDurationMs,
    lineTimeMinMs: lineMin,
    lineTimeMaxMs: lineMax,
    shiftTimeMinMs: shiftMin,
    shiftTimeMaxMs: shiftMax,
    segments,
    turns
  };
  return savedObjects;
});;

process.on("message", async (msg) => {
  try {
    // Call the module function with the passed parameters
    const result = await moduleFunction(
      msg.payload.element,
      msg.payload.savedObjects,
      msg.payload.connections,
      msg.payload.elementMap,
      msg.payload.currentElementId,
      msg.payload.uuid,
      msg.payload.port,
      msg.payload.wsEndpoint
    );
    process.send({ status: "success", result });
  } catch (err) {
    process.send({ status: "error", message: err.message });
  }
});

process.send({ status: "ready" });
    