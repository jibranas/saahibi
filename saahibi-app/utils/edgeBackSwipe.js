import { useMemo, useRef } from 'react';
import { PanResponder, Platform } from 'react-native';

const EDGE_PX = 28;
const CLAIM_DX = 12;
const COMPLETE_DX = 60;

function isEdgeBackMove(event, gesture) {
  if (event.nativeEvent.touches.length > 1) return false;
  return (
    gesture.x0 <= EDGE_PX &&
    gesture.dx > CLAIM_DX &&
    Math.abs(gesture.dx) > Math.abs(gesture.dy)
  );
}

/**
 * iOS left-edge swipe. Android keeps the system back gesture, so this
 * returns null there. The callback is read from a ref so the responder
 * can be created once.
 */
export function useEdgeBackPanResponder(onBack) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  return useMemo(() => {
    if (Platform.OS !== 'ios') return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (event, gesture) => isEdgeBackMove(event, gesture),
      onMoveShouldSetPanResponderCapture: (event, gesture) =>
        isEdgeBackMove(event, gesture),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gesture) => {
        if (
          gesture.dx >= COMPLETE_DX &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
        ) {
          onBackRef.current();
        }
      },
    }).panHandlers;
  }, []);
}
