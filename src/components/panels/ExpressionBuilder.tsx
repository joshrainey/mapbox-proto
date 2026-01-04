import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiChevronDown, FiCode, FiZap } from 'react-icons/fi';

type ExpressionType = 
  | 'literal' 
  | 'get' 
  | 'match' 
  | 'case' 
  | 'step' 
  | 'interpolate'
  | 'coalesce'
  | 'concat';

interface ExpressionNode {
  type: ExpressionType;
  value?: any;
  property?: string;
  stops?: { input: number | string; output: any }[];
  cases?: { condition: any; output: any }[];
  fallback?: any;
  interpolation?: 'linear' | 'exponential' | 'cubic-bezier';
  base?: number;
}

interface ExpressionBuilderProps {
  value: any;
  onChange: (expression: any) => void;
  propertyType: 'color' | 'number' | 'string';
  availableProperties?: string[];
  isDark?: boolean;
}

export const ExpressionBuilder = ({
  value,
  onChange,
  propertyType,
  availableProperties = [],
  isDark = true,
}: ExpressionBuilderProps) => {
  const [mode, setMode] = useState<'simple' | 'expression'>('simple');
  const [expressionType, setExpressionType] = useState<ExpressionType>('literal');
  const [expanded, setExpanded] = useState(false);

  // Parse existing value into expression node
  const expressionNode = useMemo((): ExpressionNode => {
    if (!value) return { type: 'literal', value: getDefaultValue(propertyType) };
    if (!Array.isArray(value)) return { type: 'literal', value };
    
    const [type, ...args] = value;
    switch (type) {
      case 'get':
        return { type: 'get', property: args[0] };
      case 'match':
        const matchStops: { input: string; output: any }[] = [];
        const [matchProp, ...matchRest] = args;
        for (let i = 0; i < matchRest.length - 1; i += 2) {
          matchStops.push({ input: matchRest[i], output: matchRest[i + 1] });
        }
        return {
          type: 'match',
          property: matchProp[1],
          stops: matchStops,
          fallback: matchRest[matchRest.length - 1],
        };
      case 'step':
      case 'interpolate':
        return parseInterpolate(value);
      default:
        return { type: 'literal', value };
    }
  }, [value, propertyType]);

  const buildExpression = (node: ExpressionNode): any => {
    switch (node.type) {
      case 'literal':
        return node.value;
      case 'get':
        return ['get', node.property];
      case 'match':
        if (!node.stops?.length) return node.fallback;
        const matchArgs: any[] = [['get', node.property]];
        node.stops.forEach((stop) => {
          matchArgs.push(stop.input, stop.output);
        });
        matchArgs.push(node.fallback);
        return ['match', ...matchArgs];
      case 'step':
        if (!node.stops?.length) return node.fallback;
        const stepArgs: any[] = [['get', node.property], node.fallback];
        node.stops.forEach((stop) => {
          stepArgs.push(stop.input, stop.output);
        });
        return ['step', ...stepArgs];
      case 'interpolate':
        if (!node.stops?.length) return node.fallback;
        const interpType = node.interpolation === 'exponential'
          ? ['exponential', node.base ?? 1.5]
          : ['linear'];
        const interpArgs: any[] = [interpType, ['get', node.property]];
        node.stops.forEach((stop) => {
          interpArgs.push(stop.input, stop.output);
        });
        return ['interpolate', ...interpArgs];
      default:
        return node.value;
    }
  };

  const updateExpression = (updates: Partial<ExpressionNode>) => {
    const newNode = { ...expressionNode, ...updates };
    onChange(buildExpression(newNode));
  };

  const addStop = () => {
    const stops = [...(expressionNode.stops ?? [])];
    const lastStop = stops[stops.length - 1];
    stops.push({
      input: typeof lastStop?.input === 'number' ? (lastStop.input as number) + 1 : 0,
      output: lastStop?.output ?? getDefaultValue(propertyType),
    });
    updateExpression({ stops });
  };

  const removeStop = (index: number) => {
    const stops = [...(expressionNode.stops ?? [])];
    stops.splice(index, 1);
    updateExpression({ stops });
  };

  const updateStop = (index: number, field: 'input' | 'output', value: any) => {
    const stops = [...(expressionNode.stops ?? [])];
    stops[index] = { ...stops[index], [field]: value };
    updateExpression({ stops });
  };

  return (
    <div className={`rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-3 py-2 flex items-center justify-between ${
          isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
        } rounded-lg transition-colors`}
      >
        <div className="flex items-center gap-2">
          <FiZap size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <span className={`text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Data-Driven Style
          </span>
          {expressionNode.type !== 'literal' && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`}>
              {expressionNode.type}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <FiChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Expression Type Selector */}
              <div>
                <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1.5 block`}>
                  Expression Type
                </label>
                <select
                  value={expressionNode.type}
                  onChange={(e) => {
                    const type = e.target.value as ExpressionType;
                    updateExpression({
                      type,
                      stops: type !== 'literal' && type !== 'get' ? [] : undefined,
                      fallback: getDefaultValue(propertyType),
                    });
                  }}
                  className={`w-full px-2 py-1.5 text-sm rounded ${
                    isDark
                      ? 'bg-zinc-700 text-white border-zinc-600'
                      : 'bg-white text-zinc-900 border-zinc-300'
                  } border`}
                >
                  <option value="literal">Static Value</option>
                  <option value="get">Property Value</option>
                  <option value="match">Match (Categorical)</option>
                  <option value="step">Step (Threshold)</option>
                  <option value="interpolate">Interpolate (Smooth)</option>
                </select>
              </div>

              {/* Property Selector */}
              {expressionNode.type !== 'literal' && (
                <div>
                  <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1.5 block`}>
                    Data Property
                  </label>
                  <select
                    value={expressionNode.property ?? ''}
                    onChange={(e) => updateExpression({ property: e.target.value })}
                    className={`w-full px-2 py-1.5 text-sm rounded ${
                      isDark
                        ? 'bg-zinc-700 text-white border-zinc-600'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    } border`}
                  >
                    <option value="">Select property...</option>
                    {availableProperties.map((prop) => (
                      <option key={prop} value={prop}>
                        {prop}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Static Value Input */}
              {expressionNode.type === 'literal' && (
                <ValueInput
                  type={propertyType}
                  value={expressionNode.value}
                  onChange={(v) => updateExpression({ value: v })}
                  isDark={isDark}
                />
              )}

              {/* Interpolation Options */}
              {expressionNode.type === 'interpolate' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                      Interpolation
                    </label>
                    <select
                      value={expressionNode.interpolation ?? 'linear'}
                      onChange={(e) =>
                        updateExpression({ interpolation: e.target.value as any })
                      }
                      className={`w-full px-2 py-1.5 text-sm rounded ${
                        isDark
                          ? 'bg-zinc-700 text-white border-zinc-600'
                          : 'bg-white text-zinc-900 border-zinc-300'
                      } border`}
                    >
                      <option value="linear">Linear</option>
                      <option value="exponential">Exponential</option>
                    </select>
                  </div>
                  {expressionNode.interpolation === 'exponential' && (
                    <div>
                      <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1 block`}>
                        Base
                      </label>
                      <input
                        type="number"
                        value={expressionNode.base ?? 1.5}
                        onChange={(e) =>
                          updateExpression({ base: parseFloat(e.target.value) || 1 })
                        }
                        step="0.1"
                        className={`w-full px-2 py-1.5 text-sm rounded ${
                          isDark
                            ? 'bg-zinc-700 text-white border-zinc-600'
                            : 'bg-white text-zinc-900 border-zinc-300'
                        } border`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Stops Editor */}
              {(expressionNode.type === 'match' ||
                expressionNode.type === 'step' ||
                expressionNode.type === 'interpolate') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Stops
                    </label>
                    <button
                      onClick={addStop}
                      className={`p-1 rounded ${
                        isDark ? 'hover:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                      }`}
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {expressionNode.stops?.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type={expressionNode.type === 'match' ? 'text' : 'number'}
                          value={stop.input}
                          onChange={(e) =>
                            updateStop(
                              i,
                              'input',
                              expressionNode.type === 'match'
                                ? e.target.value
                                : parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Input"
                          className={`w-20 px-2 py-1 text-xs rounded ${
                            isDark
                              ? 'bg-zinc-700 text-white border-zinc-600'
                              : 'bg-white text-zinc-900 border-zinc-300'
                          } border`}
                        />
                        <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>→</span>
                        <div className="flex-1">
                          <ValueInput
                            type={propertyType}
                            value={stop.output}
                            onChange={(v) => updateStop(i, 'output', v)}
                            isDark={isDark}
                            compact
                          />
                        </div>
                        <button
                          onClick={() => removeStop(i)}
                          className={`p-1 rounded ${
                            isDark
                              ? 'hover:bg-zinc-600 text-zinc-500'
                              : 'hover:bg-zinc-200 text-zinc-400'
                          }`}
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback Value */}
              {expressionNode.type !== 'literal' && expressionNode.type !== 'get' && (
                <div>
                  <label className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1.5 block`}>
                    Fallback Value
                  </label>
                  <ValueInput
                    type={propertyType}
                    value={expressionNode.fallback}
                    onChange={(v) => updateExpression({ fallback: v })}
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Generated Expression Preview */}
              <div className={`p-2 rounded text-xs font-mono ${
                isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  <FiCode size={12} />
                  <span>Expression</span>
                </div>
                <pre className="overflow-x-auto">
                  {JSON.stringify(buildExpression(expressionNode), null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Value Input Component
const ValueInput = ({
  type,
  value,
  onChange,
  isDark = true,
  compact = false,
}: {
  type: 'color' | 'number' | 'string';
  value: any;
  onChange: (value: any) => void;
  isDark?: boolean;
  compact?: boolean;
}) => {
  if (type === 'color') {
    return (
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className={`${compact ? 'w-6 h-5' : 'w-8 h-6'} rounded cursor-pointer border-0`}
        />
        {!compact && (
          <input
            type="text"
            value={value ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 px-2 py-1 text-xs font-mono rounded ${
              isDark
                ? 'bg-zinc-700 text-white border-zinc-600'
                : 'bg-white text-zinc-900 border-zinc-300'
            } border`}
          />
        )}
      </div>
    );
  }

  if (type === 'number') {
    return (
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${compact ? 'w-16' : 'w-full'} px-2 py-1 text-xs rounded ${
          isDark
            ? 'bg-zinc-700 text-white border-zinc-600'
            : 'bg-white text-zinc-900 border-zinc-300'
        } border`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${compact ? 'w-20' : 'w-full'} px-2 py-1 text-xs rounded ${
        isDark
          ? 'bg-zinc-700 text-white border-zinc-600'
          : 'bg-white text-zinc-900 border-zinc-300'
      } border`}
    />
  );
};

// Helpers
const getDefaultValue = (type: 'color' | 'number' | 'string'): any => {
  switch (type) {
    case 'color':
      return '#3b82f6';
    case 'number':
      return 0;
    case 'string':
      return '';
  }
};

const parseInterpolate = (expr: any[]): ExpressionNode => {
  const [type, interpType, getProp, ...stopsFlat] = expr;
  const stops: { input: number; output: any }[] = [];
  
  for (let i = 0; i < stopsFlat.length; i += 2) {
    stops.push({ input: stopsFlat[i], output: stopsFlat[i + 1] });
  }
  
  return {
    type: type as ExpressionType,
    property: getProp[1],
    stops,
    interpolation: Array.isArray(interpType) && interpType[0] === 'exponential' ? 'exponential' : 'linear',
    base: Array.isArray(interpType) && interpType[0] === 'exponential' ? interpType[1] : undefined,
    fallback: stops[0]?.output,
  };
};
