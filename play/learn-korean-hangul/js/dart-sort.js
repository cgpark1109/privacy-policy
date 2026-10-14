// Port of the Dart SDK's List.sort (dart:_internal Sort: insertion sort for
// small ranges, dual-pivot quicksort otherwise).
//
// JavaScript's Array.prototype.sort is stable, Dart's is not, so lists with
// ties (e.g. example words of equal rank) would come out in a different order
// than in the app. Using the same algorithm keeps the web identical.

const INSERTION_SORT_THRESHOLD = 32;

export function dartSort(a, compare) {
  doSort(a, 0, a.length - 1, compare);
  return a;
}

function doSort(a, left, right, compare) {
  if (right - left <= INSERTION_SORT_THRESHOLD) {
    insertionSort(a, left, right, compare);
  } else {
    dualPivotQuicksort(a, left, right, compare);
  }
}

function insertionSort(a, left, right, compare) {
  for (let i = left + 1; i <= right; i++) {
    const el = a[i];
    let j = i;
    while (j > left && compare(a[j - 1], el) > 0) {
      a[j] = a[j - 1];
      j--;
    }
    a[j] = el;
  }
}

function dualPivotQuicksort(a, left, right, compare) {
  const sixth = Math.trunc((right - left + 1) / 6);
  const index1 = left + sixth;
  const index5 = right - sixth;
  const index3 = Math.trunc((left + right) / 2);
  const index2 = index3 - sixth;
  const index4 = index3 + sixth;

  let el1 = a[index1];
  let el2 = a[index2];
  let el3 = a[index3];
  let el4 = a[index4];
  let el5 = a[index5];
  let t;
  if (compare(el1, el2) > 0) { t = el1; el1 = el2; el2 = t; }
  if (compare(el4, el5) > 0) { t = el4; el4 = el5; el5 = t; }
  if (compare(el1, el3) > 0) { t = el1; el1 = el3; el3 = t; }
  if (compare(el2, el3) > 0) { t = el2; el2 = el3; el3 = t; }
  if (compare(el1, el4) > 0) { t = el1; el1 = el4; el4 = t; }
  if (compare(el3, el4) > 0) { t = el3; el3 = el4; el4 = t; }
  if (compare(el2, el5) > 0) { t = el2; el2 = el5; el5 = t; }
  if (compare(el2, el3) > 0) { t = el2; el2 = el3; el3 = t; }
  if (compare(el4, el5) > 0) { t = el4; el4 = el5; el5 = t; }

  const pivot1 = el2;
  const pivot2 = el4;

  a[index1] = el1;
  a[index3] = el3;
  a[index5] = el5;
  a[index2] = a[left];
  a[index4] = a[right];

  let less = left + 1;
  let great = right - 1;

  const pivotsAreEqual = compare(pivot1, pivot2) === 0;
  if (pivotsAreEqual) {
    const pivot = pivot1;
    for (let k = less; k <= great; k++) {
      const ak = a[k];
      let comp = compare(ak, pivot);
      if (comp === 0) continue;
      if (comp < 0) {
        if (k !== less) {
          a[k] = a[less];
          a[less] = ak;
        }
        less++;
      } else {
        for (;;) {
          comp = compare(a[great], pivot);
          if (comp > 0) {
            great--;
            continue;
          } else if (comp < 0) {
            a[k] = a[less];
            a[less++] = a[great];
            a[great--] = ak;
            break;
          } else {
            a[k] = a[great];
            a[great--] = ak;
            break;
          }
        }
      }
    }
  } else {
    for (let k = less; k <= great; k++) {
      const ak = a[k];
      const compPivot1 = compare(ak, pivot1);
      if (compPivot1 < 0) {
        if (k !== less) {
          a[k] = a[less];
          a[less] = ak;
        }
        less++;
      } else {
        const compPivot2 = compare(ak, pivot2);
        if (compPivot2 > 0) {
          for (;;) {
            let comp = compare(a[great], pivot2);
            if (comp > 0) {
              great--;
              if (great < k) break;
              continue;
            } else {
              comp = compare(a[great], pivot1);
              if (comp < 0) {
                a[k] = a[less];
                a[less++] = a[great];
                a[great--] = ak;
              } else {
                a[k] = a[great];
                a[great--] = ak;
              }
              break;
            }
          }
        }
      }
    }
  }

  a[left] = a[less - 1];
  a[less - 1] = pivot1;
  a[right] = a[great + 1];
  a[great + 1] = pivot2;

  doSort(a, left, less - 2, compare);
  doSort(a, great + 2, right, compare);

  if (pivotsAreEqual) return;

  if (less < index1 && great > index5) {
    while (compare(a[less], pivot1) === 0) less++;
    while (compare(a[great], pivot2) === 0) great--;

    for (let k = less; k <= great; k++) {
      const ak = a[k];
      const compPivot1 = compare(ak, pivot1);
      if (compPivot1 === 0) {
        if (k !== less) {
          a[k] = a[less];
          a[less] = ak;
        }
        less++;
      } else {
        const compPivot2 = compare(ak, pivot2);
        if (compPivot2 === 0) {
          for (;;) {
            let comp = compare(a[great], pivot2);
            if (comp === 0) {
              great--;
              if (great < k) break;
              continue;
            } else {
              comp = compare(a[great], pivot1);
              if (comp < 0) {
                a[k] = a[less];
                a[less++] = a[great];
                a[great--] = ak;
              } else {
                a[k] = a[great];
                a[great--] = ak;
              }
              break;
            }
          }
        }
      }
    }
    doSort(a, less, great, compare);
  } else {
    doSort(a, less, great, compare);
  }
}
