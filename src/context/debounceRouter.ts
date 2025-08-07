import { useState } from "react";
import { router, useRouter } from "expo-router";

type RouterFn = (route: string, opts: any) => void;

export const debounce = (f: RouterFn, delay: number = 1000): RouterFn => {
  // these cache is local to each time debounce is called
  let isDebouncing = false;

  return (...args): void => {
    if (isDebouncing) {
      return undefined;
    } else {
      // set up a timeout to stop debouncing later
      isDebouncing = true;
      setTimeout(() => {
        isDebouncing = false;
      }, delay);
      return f(...args);
    }
  };
};

// By calling debounce in the global context, we make the caches global
const push = debounce(router.push) as typeof router.push;
const replace = debounce(router.push) as typeof router.replace;
const back = debounce(router.back) as typeof router.back;

type Router = typeof router;

export const useDebouncedRouter = (): Router => {
  // call this to make sure the router is installed already
  const r = useRouter();

  const [localRouter, _setRouter] = useState({ ...r, push, replace, back });

  return localRouter;
};
