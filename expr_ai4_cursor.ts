
//Cursor 版本的版本 //支持函数 //支持 for 语句 
//这个时候 ai 生成的代码已经是错误的了，可能太复杂
//多次反馈后终于修改正确，提示给它的信息为 "报错，请修复并显示完整代码 " 后面跟错误信息就行
//这是比较完善的版本，不要再修改了。留做参考

type MathFunction = (...args: number[]) => number;

class ExpressionEvaluator {
    private code: string;
    private position: number;
    private functions: Map<string, MathFunction>;
    private variables: Map<string, number>;

    constructor(code: string) {
        this.code = code.replace(/\s+/g, '');
        this.position = 0;
        this.functions = new Map<string, MathFunction>();
        this.variables = new Map<string, number>();
        
        // 添加基本数学函数
        this.functions.set('sin', Math.sin);
        this.functions.set('cos', Math.cos);
        this.functions.set('tan', Math.tan);
        this.functions.set('sqrt', Math.sqrt);
        this.functions.set('abs', Math.abs);
        this.functions.set('max', Math.max);
        this.functions.set('min', Math.min);
    }

    evaluate(): number {
        if (this.code.length === 0) {
            return 0; // 空代码返回0
        }
        const result = this.parseProgram();
        if (this.position < this.code.length) {
            throw new Error(`未预期的字符: '${this.code[this.position]}' 在位置 ${this.position}`);
        }
        return result;
    }

    private parseProgram(): number {
        let result = 0;
        while (this.position < this.code.length) {
            result = this.parseStatement();
            if (this.position < this.code.length && this.code[this.position] === ';') {
                this.position++;
            }
        }
        return result;
    }

    private parseStatement(): number {
        if (this.position >= this.code.length) {
            return 0; // 允许空语句
        }

        if (this.code[this.position] === '{') {
            return this.parseStatementBlock();
        } else if (this.code.startsWith('for', this.position)) {
            return this.parseForLoop();
        } else {
            return this.parseExpressionOrAssignment();
        }
    }

    private parseStatementBlock(): number {
        this.expectChar('{');
        let result = 0;
        while (this.position < this.code.length && this.code[this.position] !== '}') {
            result = this.parseStatement();
            if (this.position < this.code.length && this.code[this.position] === ';') {
                this.position++;
            }
        }
        this.expectChar('}');
        return result;
    }

    private parseForLoop(): number {
        const initialVariables = new Map(this.variables);
        this.position += 3; // 跳过 'for'
        this.expectChar('(');
        
        this.parseExpressionOrAssignment(); // 初始化
        this.expectChar(';');
        const conditionStart = this.position;
        let conditionEnd = this.position;
        while (conditionEnd < this.code.length && this.code[conditionEnd] !== ';') {
            conditionEnd++;
        }
        const condition = this.code.substring(conditionStart, conditionEnd);
        this.position = conditionEnd;
        this.expectChar(';');
        
        const incrementStart = this.position;
        while (this.position < this.code.length && this.code[this.position] !== ')') this.position++;
        const increment = this.code.substring(incrementStart, this.position);
        this.expectChar(')');

        const loopBodyStart = this.position;
        let result = 0;
        while (this.evaluateExpression(condition) !== 0) {
            this.position = loopBodyStart;
            result = this.parseStatement();
            this.evaluateExpression(increment);
        }

        // 恢复循环外的变量状态，但保留循环内定义的新变量
        initialVariables.forEach((value, key) => {
            if (!this.variables.has(key)) {
                this.variables.set(key, value);
            }
        });

        return result;
    }

    private parseExpressionOrAssignment(): number {
        const startPosition = this.position;
        try {
            const identifier = this.parseIdentifier();
            if (this.position < this.code.length && this.code[this.position] === '=') {
                this.position++;
                const value = this.parseExpression();
                this.variables.set(identifier, value);
                return value;
            } else {
                this.position = startPosition;
                return this.parseExpression();
            }
        } catch (error) {
            this.position = startPosition;
            return this.parseExpression();
        }
    }

    private parseExpression(): number {
        return this.parseComparisonExpression();
    }

    private parseComparisonExpression(): number {
        let left = this.parseAdditiveExpression();

        while (this.position < this.code.length) {
            if (this.code.startsWith('<=', this.position)) {
                this.position += 2;
                const right = this.parseAdditiveExpression();
                left = left <= right ? 1 : 0;
            } else if (this.code.startsWith('>=', this.position)) {
                this.position += 2;
                const right = this.parseAdditiveExpression();
                left = left >= right ? 1 : 0;
            } else if (this.code.startsWith('<', this.position)) {
                this.position++;
                const right = this.parseAdditiveExpression();
                left = left < right ? 1 : 0;
            } else if (this.code.startsWith('>', this.position)) {
                this.position++;
                const right = this.parseAdditiveExpression();
                left = left > right ? 1 : 0;
            } else if (this.code.startsWith('==', this.position)) {
                this.position += 2;
                const right = this.parseAdditiveExpression();
                left = left === right ? 1 : 0;
            } else if (this.code.startsWith('!=', this.position)) {
                this.position += 2;
                const right = this.parseAdditiveExpression();
                left = left !== right ? 1 : 0;
            } else {
                break;
            }
        }

        return left;
    }

    private parseAdditiveExpression(): number {
        let result = this.parseMultiplicativeExpression();

        while (this.position < this.code.length) {
            const char = this.code[this.position];
            if (char === '+' || char === '-') {
                this.position++;
                const value = this.parseMultiplicativeExpression();
                if (char === '+') {
                    result += value;
                } else {
                    result -= value;
                }
            } else {
                break;
            }
        }

        return result;
    }

    private parseMultiplicativeExpression(): number {
        let result = this.parseFactor();

        while (this.position < this.code.length) {
            const char = this.code[this.position];
            if (char === '*' || char === '/') {
                this.position++;
                const value = this.parseFactor();
                if (char === '*') {
                    result *= value;
                } else {
                    if (value === 0) throw new Error("除数不能为零");
                    result /= value;
                }
            } else {
                break;
            }
        }

        return result;
    }

    private parseFactor(): number {
        if (this.position >= this.code.length) {
            throw new Error("意外的表达式结束");
        }

        if (this.code[this.position] === '(') {
            this.position++;
            const result = this.parseExpression();
            this.expectChar(')');
            return result;
        }

        if (this.isLetter(this.code[this.position])) {
            const identifier = this.parseIdentifier();
            if (this.position < this.code.length && this.code[this.position] === '(') {
                return this.parseFunction(identifier);
            } else {
                if (this.variables.has(identifier)) {
                    return this.variables.get(identifier)!;
                }
                throw new Error(`未定义的变量: ${identifier}`);
            }
        }

        return this.parseNumber();
    }

    private parseFunction(funcName: string): number {
        const func = this.functions.get(funcName.toLowerCase());
        if (!func) {
            throw new Error(`未知函数: ${funcName}`);
        }
        this.expectChar('(');
        const args: number[] = [];
        if (this.position < this.code.length && this.code[this.position] !== ')') {
            do {
                args.push(this.parseExpression());
            } while (this.position < this.code.length && this.code[this.position] === ',' && ++this.position);
        }
        this.expectChar(')');
        return func(...args);
    }

    private parseNumber(): number {
        const start = this.position;
        let hasDecimal = false;
        let isNegative = false;

        if (this.code[this.position] === '-') {
            isNegative = true;
            this.position++;
        }

        while (this.position < this.code.length) {
            const char = this.code[this.position];
            if (this.isDigit(char)) {
                this.position++;
            } else if (char === '.' && !hasDecimal) {
                hasDecimal = true;
                this.position++;
            } else {
                break;
            }
        }

        if (start === this.position || (start + 1 === this.position && isNegative)) {
            throw new Error(`在位置 ${start} 预期数字`);
        }

        const numberStr = this.code.substring(start, this.position);
        return parseFloat(numberStr);
    }

    private parseIdentifier(): string {
        const start = this.position;
        while (this.position < this.code.length && (this.isLetter(this.code[this.position]) || this.isDigit(this.code[this.position]))) {
            this.position++;
        }
        if (start === this.position) {
            throw new Error(`在位置 ${start} 预期标识符`);
        }
        return this.code.substring(start, this.position);
    }

    private expectChar(char: string): void {
        if (this.position >= this.code.length) {
            throw new Error(`预期 '${char}', 但代码已结束`);
        }
        if (this.code[this.position] !== char) {
            throw new Error(`在位置 ${this.position} 预期 '${char}', 但得到 '${this.code[this.position]}'`);
        }
        this.position++;
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isLetter(char: string): boolean {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }

    addFunction(name: string, func: MathFunction): void {
        this.functions.set(name.toLowerCase(), func);
    }

    setVariable(name: string, value: number): void {
        this.variables.set(name, value);
    }

    private evaluateExpression(expr: string): number {
        const subEvaluator = new ExpressionEvaluator(expr);
        subEvaluator.functions = this.functions;
        subEvaluator.variables = new Map(this.variables);
        const result = subEvaluator.evaluate();
        this.variables = subEvaluator.variables;
        return result;
    }
}

// 使用示例
function evaluateCode(code: string): number {
    const evaluator = new ExpressionEvaluator(code);
    return evaluator.evaluate();
}

// 测试
console.log(evaluateCode("")); // 应输出: 0
console.log(evaluateCode("x=10; y=20; for(i=0;i<5;i=i+1){x=x+y;} x"));  // 应输出: 110
console.log(evaluateCode("sum=0; for(i=1;i<=10;i=i+1){sum=sum+i;} sum"));  // 应输出: 55
console.log(evaluateCode("{x=0; {x=x+1; x=x+2;} x}"));  // 应输出: 3
console.log(evaluateCode("2 + 3 * 4"));  // 应输出: 14
console.log(evaluateCode("max(5, 10) + min(3, 7)"));  // 应输出: 13
console.log(evaluateCode("x = 5; y = 3; z = x * y + 2; z"));  // 应输出: 17
console.log(evaluateCode("-5 + 3"));  // 应输出: -2
console.log(evaluateCode("3.14 * 2"));  // 应输出: 6.28


/*

//for 支持多语句时是这样
//-----------------------------------------------
program    = statement_block;

statement_block = "{", {statement}, "}";

statement  = for_loop | 
             assignment |
             expression, ";" |
             statement_block;

for_loop   = "for", "(", initialization, ";", condition, ";", increment, ")", 
             statement_block;

initialization = identifier, "=", expression;
condition      = expression;
increment      = identifier, "=", expression;

assignment = identifier, "=", expression, ";";

expression = term, {("+" | "-"), term};
term       = factor, {("*" | "/"), factor};
factor     = number | 
             identifier |
             function_call |
             "(", expression, ")";

function_call = identifier, "(", [expression, {",", expression}], ")";

number     = digit, {digit}, [".", digit, {digit}];
identifier = letter, {letter | digit};
digit      = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
letter     = "a" | "b" | ... | "z" | "A" | "B" | ... | "Z";

//-----------------------------------------------
//不支持多语句的方法是这样，可以对比一下

program    = statement;

statement  = for_loop | expression;

for_loop   = "for", "(", initialization, ";", condition, ";", increment, ")", 
             "{", expression, "}";

initialization = identifier, "=", expression;
condition      = expression;
increment      = identifier, "=", expression;

expression = term, {("+" | "-"), term};
term       = factor, {("*" | "/"), factor};
factor     = number | 
             identifier |
             function_call |
             "(", expression, ")";

function_call = identifier, "(", [expression, {",", expression}], ")";

number     = digit, {digit}, [".", digit, {digit}];
identifier = letter, {letter | digit};
digit      = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
letter     = "a" | "b" | ... | "z" | "A" | "B" | ... | "Z";

*/



