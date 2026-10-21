// Trailing-edge throttle shared by the realtime layers: the final call always lands.
export function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let pending = null;

  const invoke = () => {
    last = Date.now();
    timer = null;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const throttled = (...args) => {
    pending = args;
    const elapsed = Date.now() - last;
    if (elapsed >= wait) invoke();
    else if (!timer) timer = setTimeout(invoke, wait - elapsed);
  };

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return throttled;
}
