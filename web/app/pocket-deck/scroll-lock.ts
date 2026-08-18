type ScrollLockStyle = Pick<
  CSSStyleDeclaration,
  | "overflow"
  | "overscrollBehavior"
  | "position"
  | "top"
  | "left"
  | "right"
  | "width"
>;

type ScrollLockDocument = {
  body: { style: ScrollLockStyle };
  documentElement: { style: ScrollLockStyle };
};

type ScrollLockWindow = {
  scrollX: number;
  scrollY: number;
  scrollTo: (x: number, y: number) => void;
};

export type PocketDeckScrollUnlockRef = {
  current: null | (() => void);
};

export function acquirePocketDeckShowViewLock(
  unlockRef: PocketDeckScrollUnlockRef,
  createLock: () => () => void,
): void {
  if (unlockRef.current) return;
  unlockRef.current = createLock();
}

export function releasePocketDeckShowViewLock(
  unlockRef: PocketDeckScrollUnlockRef,
): void {
  const unlock = unlockRef.current;
  if (!unlock) return;
  unlockRef.current = null;
  unlock();
}

export function lockPocketDeckDocumentScroll(
  documentTarget: ScrollLockDocument,
  windowTarget: ScrollLockWindow,
): () => void {
  const body = documentTarget.body.style;
  const root = documentTarget.documentElement.style;
  const scrollX = windowTarget.scrollX;
  const scrollY = windowTarget.scrollY;
  const previous = {
    bodyOverflow: body.overflow,
    bodyPosition: body.position,
    bodyTop: body.top,
    bodyLeft: body.left,
    bodyRight: body.right,
    bodyWidth: body.width,
    rootOverflow: root.overflow,
    rootOverscrollBehavior: root.overscrollBehavior,
  };

  root.overflow = "hidden";
  root.overscrollBehavior = "none";
  body.overflow = "hidden";
  body.position = "fixed";
  body.top = `-${scrollY}px`;
  body.left = `-${scrollX}px`;
  body.right = "0px";
  body.width = "100%";

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    body.overflow = previous.bodyOverflow;
    body.position = previous.bodyPosition;
    body.top = previous.bodyTop;
    body.left = previous.bodyLeft;
    body.right = previous.bodyRight;
    body.width = previous.bodyWidth;
    root.overflow = previous.rootOverflow;
    root.overscrollBehavior = previous.rootOverscrollBehavior;
    windowTarget.scrollTo(scrollX, scrollY);
  };
}
