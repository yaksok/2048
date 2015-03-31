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

function ____1gs____gs(범위, 무언가) {function ____find_and_call_function(matcher, scope, functions) {
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

    
    범위.push(무언가)
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____1gs____gs, [['IDENTIFIER', '범위'], ['WS', ' '], ['STR', '뒤에'], ['WS', ' '], ['IDENTIFIER', '무언가'], ['WS', ' '], ['STR', '추가']]])

function ____2gs____gs(범위) {function ____find_and_call_function(matcher, scope, functions) {
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

    
    return 범위.length;
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____2gs____gs, [['IDENTIFIER', '범위'], ['WS', ' '], ['STR', '길이']]])

function ____3gs____gs(범위) {function ____find_and_call_function(matcher, scope, functions) {
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

    
    var ret= [];
    for(var i = 범위.length-1;i >= 0; i--)
        ret.push(범위[i]);
    return ret;
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____3gs____gs, [['IDENTIFIER', '범위'], ['WS', ' '], ['STR', '뒤집기']]])

function ____4gs____gs(범위) {function ____find_and_call_function(matcher, scope, functions) {
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

    
    return 범위[Math.floor(Math.random() * 범위.length)];
}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____4gs____gs, [['IDENTIFIER', '범위'], ['WS', ' '], ['STR', '랜덤'], ['WS', ' '], ['STR', '선택']]])

function ____5gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['빈칸들'] = 1
    빈칸들 = []
    ____scope['결과'] = 1
    결과 = 0
    for (var ____js_gs_1 in ____range(1, (16 + 1))) {____scope["위치"] = 1
    var 위치=____range(1, (16 + 1))[____js_gs_1];
        if ((____subscript(판, 위치) == 0)) {
            ____find_and_call_function([['NAME', '빈칸들'], ['NAME', '뒤에'], ['NAME', '위치'], ['NAME', '추가']], null, ____functions)}}
    if ((____find_and_call_function([['NAME', '빈칸들'], ['NAME', '길이']], null, ____functions) > 0)) {
        ____scope['결과'] = 1
        결과 = ____find_and_call_function([['NAME', '빈칸들'], ['NAME', '랜덤'], ['NAME', '선택']], null, ____functions)}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____5gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '빈칸'], ['WS', ' '], ['STR', '찾기']]])

function ____6gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['새_숫자'] = 1
    새_숫자 = 2
    if ((____find_and_call_function([['EXPR', ____range(1, (10 + 1))], ['NAME', '랜덤'], ['NAME', '선택']], null, ____functions) == 10)) {
        ____scope['새_숫자'] = 1
        새_숫자 = 4}
    ____scope['위치'] = 1
    위치 = ____find_and_call_function([['NAME', '판'], ['NAME', '빈칸'], ['NAME', '찾기']], null, ____functions)
    if ((위치 == 0)) {
        ____scope['결과'] = 1
        결과 = false
        return 결과}
    ____scope['결과'] = 1
    결과 = true
    판[(위치 - 1)] = [새_숫자, [(-1)]]
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____6gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '랜덤'], ['WS', ' '], ['STR', '생성']]])

function ____7gs____gs() {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (var ____js_gs_2 in ____range(1, (2 + 1))) {____scope["숫자"] = 1
    var 숫자=____range(1, (2 + 1))[____js_gs_2];
        ____find_and_call_function([['NAME', '결과'], ['NAME', '랜덤'], ['NAME', '생성']], null, ____functions)}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____7gs____gs, [['STR', '새'], ['WS', ' '], ['STR', '게임'], ['WS', ' '], ['STR', '준비']]])

function ____8gs____gs(판, 세로방향, 가로방향) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1, '세로방향': 1, '가로방향': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = false
    ____scope['합쳐짐'] = 1
    합쳐짐 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ____scope['순서'] = 1
    순서 = ____range(1, (16 + 1))
    if (((가로방향 > 0) || (세로방향 > 0))) {
        ____scope['순서'] = 1
        순서 = ____find_and_call_function([['NAME', '순서'], ['NAME', '뒤집기']], null, ____functions)}
    for (var ____js_gs_3 in 순서) {____scope["위치"] = 1
    var 위치=순서[____js_gs_3];
        if ((____subscript(판, 위치) == 0)) {
            continue;}
        ____subscript(판, 위치)[(2 - 1)] = [위치]
        ____scope['다음위치'] = 1
        다음위치 = 위치
        ____scope['합쳐야함'] = 1
        합쳐야함 = false
        ____scope['가로위치'] = 1
        가로위치 = (((위치 - 1) % 4) + 1)
        ____scope['세로위치'] = 1
        세로위치 = (((위치 - 가로위치) / 4) + 1)
        while (1) {
            ____scope['이동할위치'] = 1
            이동할위치 = 다음위치
            ____scope['다음위치'] = 1
            다음위치 = ((다음위치 + 가로방향) + (세로방향 * 4))
            ____scope['세로위치'] = 1
            세로위치 = (세로위치 + 세로방향)
            ____scope['가로위치'] = 1
            가로위치 = (가로위치 + 가로방향)
            if (((가로위치 < 1) || (가로위치 > 4))) {
                break;}
            if (((세로위치 < 1) || (세로위치 > 4))) {
                break;}
            if ((____subscript(판, 다음위치) != 0)) {
                if (((____subscript(합쳐짐, 다음위치) == 0) && (____subscript(____subscript(판, 다음위치), 1) == ____subscript(____subscript(판, 위치), 1)))) {
                    ____scope['합쳐야함'] = 1
                    합쳐야함 = true
                    합쳐짐[(다음위치 - 1)] = 1}
                break;}}
        if (합쳐야함) {
            판[(위치 - 1)] = 0
            ____subscript(판, 다음위치)[(1 - 1)] = (____subscript(____subscript(판, 다음위치), 1) * 2)
            ____find_and_call_function([['EXPR', ____subscript(____subscript(판, 다음위치), 2)], ['NAME', '뒤에'], ['NAME', '위치'], ['NAME', '추가']], null, ____functions)
            ____scope['결과'] = 1
            결과 = true}
        else if ( (위치 != 이동할위치)) {
            판[(이동할위치 - 1)] = ____subscript(판, 위치)
            ____subscript(판, 이동할위치)[(2 - 1)] = [위치]
            판[(위치 - 1)] = 0
            ____scope['결과'] = 1
            결과 = true}}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____8gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['IDENTIFIER', '세로방향'], ['WS', ' '], ['IDENTIFIER', '가로방향'], ['WS', ' '], ['STR', '이동']]])

function ____9gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = ____find_and_call_function([['NAME', '판'], ['EXPR', 0], ['EXPR', (-1)], ['NAME', '이동']], null, ____functions)
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____9gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '왼쪽으로']]])

function ____10gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = ____find_and_call_function([['NAME', '판'], ['EXPR', 0], ['EXPR', 1], ['NAME', '이동']], null, ____functions)
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____10gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '오른쪽으로']]])

function ____11gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = ____find_and_call_function([['NAME', '판'], ['EXPR', (-1)], ['EXPR', 0], ['NAME', '이동']], null, ____functions)
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____11gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '위로']]])

function ____12gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    ____scope['결과'] = 1
    결과 = ____find_and_call_function([['NAME', '판'], ['EXPR', 1], ['EXPR', 0], ['NAME', '이동']], null, ____functions)
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____12gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '아래로']]])

function ____13gs____gs(판) {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1, '판': 1}
    결과 = null
    for (var ____js_gs_4 in ____range(1, (4 + 1))) {____scope["줄"] = 1
    var 줄=____range(1, (4 + 1))[____js_gs_4];
        ____find_and_call_function([['EXPR', ____subscript(판, ____range((((줄 - 1) * 4) + 1), ((줄 * 4) + 1)))], ['NAME', '보여주기']], null, ____functions)}
    ____find_and_call_function([['EXPR', ''], ['NAME', '보여주기']], null, ____functions)
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____13gs____gs, [['IDENTIFIER', '판'], ['WS', ' '], ['STR', '출력']]])

function ____14gs____gs() {function ____find_and_call_function(matcher, scope, functions) {
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
    ____scope = {____parent: ____scope, '결과': 1}
    결과 = null
    ____scope['판'] = 1
    판 = ____find_and_call_function([['NAME', '새'], ['NAME', '게임'], ['NAME', '준비']], null, ____functions)
    ____find_and_call_function([['NAME', '판'], ['NAME', '출력']], null, ____functions)
    for (var ____js_gs_5 in ____range(1, (100 + 1))) {____scope["숫자"] = 1
    var 숫자=____range(1, (100 + 1))[____js_gs_5];
        ____scope['아무것도안함'] = 1
        아무것도안함 = true
        if (____find_and_call_function([['NAME', '판'], ['NAME', '왼쪽으로']], null, ____functions)) {
            ____find_and_call_function([['EXPR', '왼'], ['NAME', '보여주기']], null, ____functions)
            ____find_and_call_function([['NAME', '판'], ['NAME', '랜덤'], ['NAME', '생성']], null, ____functions)
            ____find_and_call_function([['NAME', '판'], ['NAME', '출력']], null, ____functions)
            ____scope['아무것도안함'] = 1
            아무것도안함 = false}
        if (____find_and_call_function([['NAME', '판'], ['NAME', '아래로']], null, ____functions)) {
            ____find_and_call_function([['EXPR', '아'], ['NAME', '보여주기']], null, ____functions)
            ____find_and_call_function([['NAME', '판'], ['NAME', '랜덤'], ['NAME', '생성']], null, ____functions)
            ____find_and_call_function([['NAME', '판'], ['NAME', '출력']], null, ____functions)
            ____scope['아무것도안함'] = 1
            아무것도안함 = false}
        if (아무것도안함) {
            if (____find_and_call_function([['NAME', '판'], ['NAME', '오른쪽으로']], null, ____functions)) {
                ____find_and_call_function([['EXPR', '오'], ['NAME', '보여주기']], null, ____functions)
                ____find_and_call_function([['NAME', '판'], ['NAME', '랜덤'], ['NAME', '생성']], null, ____functions)
                ____find_and_call_function([['NAME', '판'], ['NAME', '출력']], null, ____functions)
                ____scope['아무것도안함'] = 1
                아무것도안함 = false}}
        if (아무것도안함) {
            if (____find_and_call_function([['NAME', '판'], ['NAME', '위로']], null, ____functions)) {
                ____find_and_call_function([['EXPR', '위'], ['NAME', '보여주기']], null, ____functions)
                ____find_and_call_function([['NAME', '판'], ['NAME', '랜덤'], ['NAME', '생성']], null, ____functions)
                ____find_and_call_function([['NAME', '판'], ['NAME', '출력']], null, ____functions)
                ____scope['아무것도안함'] = 1
                아무것도안함 = false}}}
    return 결과}
if ((typeof(____functions) === 'undefined')) {
    ____functions = []}
____functions.push([____14gs____gs, [['STR', '테스트']]])
