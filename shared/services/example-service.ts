/** Example : Client・Server で共通するビジネスロジックがある場合はこのような Service クラスを設ける */
export class ExampleService {
  /** Example : 何らかの計算処理 */
  public static calcExample(amount: number): number {
    return amount + 1;
  }
}
