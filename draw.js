없음 = null;
____debug = false;
____range = function(s, e) {
    var ret = [];
    for(var i = s; i < e; i ++) {
        ret.push(i);
    }
    return ret;
};
____eval = eval;

if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

function ____slice(array, from, to, step) {
    if (from===null) from=0;
    if (to===null) to=array.length;
    if (!step) return array.slice(from, to);
    var result = Array.prototype.slice.call(array, from, to);
    if (step < 0) result.reverse();
    step = Math.abs(step);
    if (step > 1) {
        var final = [];
        for (var i = result.length - 1; i >= 0; i--) {
            (i % step === 0) && final.push(result[i]);
        };
        final.reverse();
        result = final;
   }
   return result;
}


function ____subscript(l, x) {
    if (Array.isArray(x)) {
        var ret = [];
        for(var i = 0; i < x.length; i ++)
            ret.push(l[x[i]-1]);
        return ret;
    }
    else {
        if (x > 0)
            x -= 1;
        return l[x];
    }
}

function ____print_one(x) {
    console.log(x);
}

function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}


if (typeof(____functions) == 'undefined')
____functions = [[____print_one, [['IDENTIFIER', '값'], ['WS',' '], ['STR', '보여주기']]]];
if (typeof(____scope) == 'undefined')
    ____global_scope = ____scope = {____parent:null};

____scope['폰트'] = 1
폰트 = ['***  *  *** *** * * *** *   *** *** ***', '* *  *    *   * * * *   *     * * * * *', '* *  *  *** *** *** *** ***   * *** ***', '* *  *  *     *   *   * * *   * * *   *', '***  *  *** ***   * *** ***   * ***   *']

function ____1gs____gs(값) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    return 값*1.0;
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____1gs____gs, [['IDENTIFIER', '값'], ['WS', ' '], ['STR', '숫자로']]])

function ____2gs____gs(값) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    return 값.toString();
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____2gs____gs, [['IDENTIFIER', '값'], ['WS', ' '], ['STR', '문자열로']]])

function ____3gs____gs(값) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    return 값.toString().length;
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____3gs____gs, [['IDENTIFIER', '값'], ['WS', ' '], ['STR', '문자열로'], ['WS', ' '], ['STR', '길이']]])

function ____4gs____gs(가로, 세로, 크기, 색) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    putrectangle(가로, 세로, 크기, 크기, 색)
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____4gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '에'], ['WS', ' '], ['IDENTIFIER', '크기'], ['WS', ' '], ['IDENTIFIER', '색'], ['WS', ' '], ['STR', '면'], ['WS', ' '], ['STR', '칠하기']]])

function ____5gs____gs(가로, 세로, 색) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    // ???
    putpixel(가로, 세로, 색)
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____5gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '에'], ['WS', ' '], ['IDENTIFIER', '색'], ['WS', ' '], ['STR', '점'], ['WS', ' '], ['STR', '찍기']]])

function ____6gs____gs(값) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    return Math.log(값)/Math.log(2)
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____6gs____gs, [['STR', '로그'], ['WS', ' '], ['IDENTIFIER', '값']]])

function ____7gs____gs(HSV) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    
    var h = HSV[0];
    var s = HSV[1];
    var v = HSV[2];
    var r, g, b;
    if( s == 0 ) {
        // achromatic (grey)
        return [v*255>>0,v*255>>0,v*255>>0];
    }
    h /= 60;            // sector 0 to 5
    var i = Math.floor( h );
    var f = h - i;          // factorial part of h
    var p = v * ( 1 - s );
    var q = v * ( 1 - s * f );
    var t = v * ( 1 - s * ( 1 - f ) );
    switch( i ) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        default:        // case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return [r*255>>0,g*255>>0,b*255>>0];
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____7gs____gs, [['STR', 'HSV'], ['WS', ' '], ['IDENTIFIER', 'HSV'], ['STR', '에서'], ['WS', ' '], ['STR', 'RGB로']]])

function ____8gs____gs(가로, 세로, 글자색, 숫자) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    var 결과, ____scope
    ____scope = {____parent: ____scope, '결과': 1, '가로': 1, '세로': 1, '글자색': 1, '숫자': 1}
    결과 = null
    for (var ____js_gs_1 in ____range(1, (3 + 1))) {____scope["가로위치"] = 1
    var 가로위치=____range(1, (3 + 1))[____js_gs_1];
        for (var ____js_gs_2 in ____range(1, (5 + 1))) {____scope["세로위치"] = 1
        var 세로위치=____range(1, (5 + 1))[____js_gs_2];
            if ((____subscript(____subscript(폰트, 세로위치), ((숫자 * 4) + 가로위치)) == '*')) {
                ____find_and_call_function([['EXPR', ((가로 + 가로위치) - 2)], ['EXPR', ((세로 + 세로위치) - 3)], ['NAME', '에'], ['NAME', '글자색'], ['NAME', '점'], ['NAME', '찍기']], null, ____functions)}}}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____8gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '에'], ['WS', ' '], ['IDENTIFIER', '글자색'], ['WS', ' '], ['IDENTIFIER', '숫자'], ['WS', ' '], ['STR', '그리기']]])
____scope['타일간격'] = 1
타일간격 = ((((2 + 2) + (4 * 4)) + 1) + 1)
____scope['하얀색'] = 1
하얀색 = [255, 255, 255]

function ____9gs____gs(가로, 세로, 길이) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    var 결과, ____scope
    ____scope = {____parent: ____scope, '결과': 1, '가로': 1, '세로': 1, '길이': 1}
    결과 = null
    for (var ____js_gs_3 in ____range(1, (길이 + 1))) {____scope["위치"] = 1
    var 위치=____range(1, (길이 + 1))[____js_gs_3];
        ____find_and_call_function([['EXPR', ((가로 + 위치) - 1)], ['NAME', '세로'], ['NAME', '에'], ['NAME', '하얀색'], ['NAME', '점'], ['NAME', '찍기']], null, ____functions)}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____9gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '부터'], ['WS', ' '], ['IDENTIFIER', '길이'], ['STR', '의'], ['WS', ' '], ['STR', '가로선'], ['WS', ' '], ['STR', '그리기']]])

function ____10gs____gs(가로, 세로, 길이) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    var 결과, ____scope
    ____scope = {____parent: ____scope, '결과': 1, '가로': 1, '세로': 1, '길이': 1}
    결과 = null
    for (var ____js_gs_4 in ____range(1, (길이 + 1))) {____scope["위치"] = 1
    var 위치=____range(1, (길이 + 1))[____js_gs_4];
        ____find_and_call_function([['NAME', '가로'], ['EXPR', ((세로 + 위치) - 1)], ['NAME', '에'], ['NAME', '하얀색'], ['NAME', '점'], ['NAME', '찍기']], null, ____functions)}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____10gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '부터'], ['WS', ' '], ['IDENTIFIER', '길이'], ['STR', '의'], ['WS', ' '], ['STR', '세로선'], ['WS', ' '], ['STR', '그리기']]])

function ____11gs____gs(가로, 세로, 숫자, 커짐, 나타남) {function ____find_and_call_function(matcher, scope, functions) {
    var has_variable = function (x) {
        function rec_lookup(scope, x)
        {
            if (typeof(____scope[x]) != 'undefined')
                return true;

            if (scope.____parent == null)
                return false;

            return rec_lookup(scope.____parent, x);
        }

        if (typeof(____global_scope[x]) != 'undefined')
            return true;
        return rec_lookup(____scope, x);
        /*
        try {
            eval(x);
        }
        catch(e) {
            return false;
        };
        return true;
        */
    };

    var get_variable_value = function (x) {
        return eval(x);
    };

    var try_match = function (proto, mi, pi) {
        if (matcher.length == mi && proto.length == pi)
            return [[]];
        if (matcher.length == mi)
            return [];
        if (proto.length == pi)
            return [];
        if (matcher[mi][0] == 'EXPR') {
            if (proto[pi][0] == 'IDENTIFIER') {
                var skip = 1;
                if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                    skip = 2;
                var ret = try_match(proto, mi+1, pi+skip);
                for(var i=0; i < ret.length; i ++) {
                    ret[i] = [matcher[mi][1]].concat(ret[i]);
                }
                return ret;
            }
            return [];
        } else { // matcher[mi][0] == 'NAME'
            if (proto[pi][0] == 'IDENTIFIER') {
                var sole_variable_exists = false;
                var to_ret = [];
                // 전체 이름에 해당하는 변수가 존재
                if (has_variable(matcher[mi][1])) {
                    sole_variable_exists = true;
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    var ret = try_match(proto, mi+1, pi+skip);
                    for(var i = 0; i < ret.length; i ++) {
                        to_ret.push([get_variable_value(matcher[mi][1])].concat(ret[i]));
                    }
                }

                // 정의에 빈칸 없는 경우, 잘라서 시도해본다
                if (proto.length >= pi+2 && proto[pi+1][0] != 'WS') {
                    var try_sliced_str_match = function (each_str) {
                        var to_ret = [];
                        if (matcher[mi][1].endsWith(each_str)) {
                            var variable_name = matcher[mi][1].substr(0, matcher[mi][1].length-each_str.length);
                            if (has_variable(variable_name)) {
                                var skip = 2;
                                if (proto.length >= pi+3 && proto[pi+2][0] == 'WS')
                                    skip = 3;
                                var ret = try_match(proto, mi+1, pi+3);
                                for(var i = 0; i < ret.length; i ++) {
                                    var sub_candidate = ret[i];
                                    if (sole_variable_exists)
                                        throw "헷갈릴 수 있는 변수명이 사용됨: " + matcher[mi][1] + " / " + variable_name + "+" + each_str;
                                    to_ret.push([get_variable_value(variable_name)].concat(sub_candidate));
                                }
                            }
                        }
                        return to_ret;
                    };
                    if (proto[pi+1][0] == 'STRS') {
                        for(var i = 0; i < proto[pi+1][1].length; i ++) {
                            var each_str = proto[pi+1][1][i];
                            to_ret.concat(try_sliced_str_match(each_str));
                        }
                    } else if (proto[pi+1][0] == 'STR') {
                        to_ret.concat(try_sliced_str_match(proto[pi+1][1]));
                    }
                }
                return to_ret;
            } else if (proto[pi][0] == 'STR') {
                if (matcher[mi][1] == proto[pi][1]) {
                    var skip = 1;
                    if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                        skip = 2;
                    return try_match(proto, mi+1, pi+skip);
                }
                return [];
            } else if (proto[pi][0] == 'STRS') {
                var to_ret = [];
                for(var i = 0; i < proto[pi][1].length; i ++) {
                    var each_str = proto[pi][1][i];
                    if (matcher[mi][1] == each_str) {
                        var skip = 1;
                        if (proto.length >= pi+2 && proto[pi+1][0] == 'WS')
                            skip = 2;
                        to_ret.concat(proto, mi+1, pi+skip);
                    }
                }
                return to_ret;
            }
        }
    };

    var candidates = [];
    for(var i = 0; i < functions.length; i ++) {
        var func = functions[i][0];
        var proto = functions[i][1];
        var ret = try_match(proto, 0, 0);
        for(var j = 0; j < ret.length; j ++) {
            candidates.push([func, ret[j]])
        }
    }

    if (candidates.length == 0)
        throw "해당하는 약속을 찾을 수 없습니다.";
    if (candidates.length >= 2)
        throw "적용할 수 있는 약속이 여러개입니다.";

    func = candidates[0][0];
    args = candidates[0][1];
    return func.apply(null, args);
}

    var 결과, ____scope
    ____scope = {____parent: ____scope, '결과': 1, '가로': 1, '세로': 1, '숫자': 1, '커짐': 1, '나타남': 1}
    결과 = null
    ____scope['가로'] = 1
    가로 = ((가로 * 타일간격) + 1)
    ____scope['세로'] = 1
    세로 = ((세로 * 타일간격) + 1)
    ____scope['추가간격'] = 1
    추가간격 = 0
    if (커짐) {
        ____scope['추가간격'] = 1
        추가간격 = 1}
    if (나타남) {
        ____scope['추가간격'] = 1
        추가간격 = (-3)}
    ____scope['선길이'] = 1
    선길이 = ((타일간격 + (추가간격 * 2)) - 1)
    ____find_and_call_function([['EXPR', (가로 - 추가간격)], ['EXPR', (세로 - 추가간격)], ['NAME', '부터'], ['NAME', '선길이'], ['NAME', '의'], ['NAME', '가로선'], ['NAME', '그리기']], null, ____functions)
    ____find_and_call_function([['EXPR', (가로 - 추가간격)], ['EXPR', (세로 - 추가간격)], ['NAME', '부터'], ['NAME', '선길이'], ['NAME', '의'], ['NAME', '세로선'], ['NAME', '그리기']], null, ____functions)
    ____find_and_call_function([['EXPR', (가로 - 추가간격)], ['EXPR', (((세로 + 추가간격) + 타일간격) - 2)], ['NAME', '부터'], ['NAME', '선길이'], ['NAME', '의'], ['NAME', '가로선'], ['NAME', '그리기']], null, ____functions)
    ____find_and_call_function([['EXPR', (((가로 + 추가간격) + 타일간격) - 2)], ['EXPR', (세로 - 추가간격)], ['NAME', '부터'], ['NAME', '선길이'], ['NAME', '의'], ['NAME', '세로선'], ['NAME', '그리기']], null, ____functions)
    ____scope['H'] = 1
    H = ((210 + 120) - ((____find_and_call_function([['NAME', '로그'], ['NAME', '숫자']], null, ____functions) - 1) * 22))
    if ((H < 0)) {
        ____scope['H'] = 1
        H = 0}
    ____scope['배경색'] = 1
    배경색 = ____find_and_call_function([['NAME', 'HSV'], ['EXPR', [H, 1, 1]], ['NAME', '에서'], ['NAME', 'RGB로']], null, ____functions)
    if ((숫자 == 2048)) {
        ____scope['배경색'] = 1
        배경색 = [255, 255, 0]}
    ____scope['배경크기'] = 1
    배경크기 = ((타일간격 + (추가간격 * 2)) - 3)
    ____find_and_call_function([['EXPR', ((가로 - 추가간격) + 1)], ['EXPR', ((세로 - 추가간격) + 1)], ['NAME', '에'], ['NAME', '배경크기'], ['NAME', '배경색'], ['NAME', '면'], ['NAME', '칠하기']], null, ____functions)
    if (나타남) {
        return 결과}
    ____scope['가로중앙'] = 1
    가로중앙 = (가로 + ((타일간격 - 2) / 2))
    ____scope['세로중앙'] = 1
    세로중앙 = (세로 + ((타일간격 - 2) / 2))
    ____scope['너비'] = 1
    너비 = (____find_and_call_function([['NAME', '숫자'], ['NAME', '문자열로'], ['NAME', '길이']], null, ____functions) * 4)
    ____scope['글자위치'] = 1
    글자위치 = 0
    for (var ____js_gs_5 in ____find_and_call_function([['NAME', '숫자'], ['NAME', '문자열로']], null, ____functions)) {____scope["글자"] = 1
    var 글자=____find_and_call_function([['NAME', '숫자'], ['NAME', '문자열로']], null, ____functions)[____js_gs_5];
        ____find_and_call_function([['EXPR', (((가로중앙 - (너비 / 2)) + (글자위치 * 4)) + 2)], ['NAME', '세로중앙'], ['NAME', '에'], ['NAME', '하얀색'], ['EXPR', ____find_and_call_function([['NAME', '글자'], ['NAME', '숫자로']], null, ____functions)], ['NAME', '그리기']], null, ____functions)
        ____scope['글자위치'] = 1
        글자위치 = (글자위치 + 1)}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____11gs____gs, [['IDENTIFIER', '가로'], ['WS', ' '], ['IDENTIFIER', '세로'], ['STR', '에'], ['WS', ' '], ['IDENTIFIER', '숫자'], ['WS', ' '], ['STR', '타일'], ['WS', ' '], ['STR', '그리기'], ['WS', ' '], ['IDENTIFIER', '커짐'], ['WS', ' '], ['IDENTIFIER', '나타남']]])
