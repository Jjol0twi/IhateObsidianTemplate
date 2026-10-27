## Wide Tables

This paragraph keeps the normal readable width. Tables that fit stay aligned with this text column. Only tables needing more width expand into the remaining note pane space. Narrow panes wrap cell content without horizontal scrolling.

## Compact Table

| 연산 | 일반적인 시간 복잡도 |
| --- | --- |
| `get(i)` | `O(1)` |
| `set(i, x)` | `O(1)` |
| `size()` | `O(1)` |
| `isEmpty()` | `O(1)` |
| `getFirst()` | `O(1)` |
| `getLast()` | `O(1)` |

## Detailed Table

| 단계 | 하는 일 | 최고 점수 예시 |
| --- | --- | --- |
| 문제 정의 | 원하는 결과, 입력 범위, 제약과 성공 기준을 정합니다. | 유한한 정수 점수 목록에서 최고 점수 하나를 구합니다. |
| 해결 방법 설계 | 자료를 정의하고 계산 절차를 설계합니다. | 점수를 배열 `A`로 표현하고, 지금까지의 최댓값을 기억하며 한 번 순회합니다. |
| 실행 | 절차를 손으로 추적하거나 프로그램으로 구현해 수행합니다. | `[72, 91, 85]`를 처리하며 저장된 최댓값이 어떻게 바뀌는지 확인합니다. |
| 결과 반환과 검증 | 계산한 값을 호출자에게 전달하고, 요구와 일치하는지 확인합니다. | `91`을 반환합니다. 이 값이 원래 목록에 있고 모든 점수 이상인지 확인합니다. |

## Long Values

| Kind | Value                                                                                                                              | Expected                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| URL  | <https://example.com/abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789> | Wrap without hiding text.      |
| Code | `someVeryLongIdentifierWithoutAnySpaces.someOtherVeryLongIdentifierWithoutAnySpaces.runWithoutTruncatingTheCode()`                 | Preserve the full inline code. |

This paragraph also keeps the normal readable width.
