import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import {
  INITIAL_CHAT_MESSAGES,
  QUICK_PROMPTS,
  BOT_RESPONSES,
  MOCK_BILL_BREAKDOWN,
} from '../constants/mockData';

export default function BillChatScreen() {
  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = (textToSend) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: messageContent,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Trigger AI response with realistic delay
    setTimeout(() => {
      let botReplyText =
        'Nauunawaan ko! Ang smart meter analytics mo ay nagpapakita na ang pinakamabilis na paraan para mapababa ang bill ay i-shift ang mabibigat na konsumo (plantsa, heater, at AC) sa labas ng 2 PM - 5 PM peak demand window. May iba ka pa bang nais itanong tungkol sa iyong kuryente?';

      if (BOT_RESPONSES[messageContent]) {
        botReplyText = BOT_RESPONSES[messageContent].text;
      } else if (messageContent.toLowerCase().includes('aircon') || messageContent.toLowerCase().includes('ac')) {
        botReplyText = BOT_RESPONSES['Bakit lumobo ang Aircon ko?'].text;
      } else if (messageContent.toLowerCase().includes('breakdown') || messageContent.toLowerCase().includes('line')) {
        botReplyText = BOT_RESPONSES['Himayin ang Bill Line-by-Line 📋'].text;
      } else if (messageContent.toLowerCase().includes('tipid') || messageContent.toLowerCase().includes('save')) {
        botReplyText = BOT_RESPONSES['Paano ako makakatipid ng ₱500?'].text;
      }

      const botReply = {
        id: `msg-reply-${Date.now()}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: botReplyText,
      };

      setMessages((prev) => [...prev, botReply]);
    }, 600);
  };

  const toggleVoiceMode = () => {
    setIsVoiceActive(!isVoiceActive);
    Alert.alert(
      !isVoiceActive ? '🔊 Voice Mode Activated' : '🔇 Voice Mode Deactivated',
      !isVoiceActive
        ? 'Ate KuryenTipid will now read billing summaries out loud in conversational Taglish.'
        : 'Audio playback muted.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {/* Chat Screen Top Bar */}
        <View style={styles.chatHeader}>
          <View style={styles.botProfile}>
            <View style={styles.avatarWrap}>
              <Ionicons name="sparkles" size={18} color={COLORS.white} />
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.botName}>Ate KuryenTipid AI</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.botRole}>Conversational Energy Advisor</Text>
            </View>
          </View>

          {/* Voice Mode Toggle Button */}
          <TouchableOpacity
            style={[styles.voiceButton, isVoiceActive && styles.voiceButtonActive]}
            onPress={toggleVoiceMode}
          >
            <Ionicons
              name={isVoiceActive ? 'volume-high' : 'volume-medium-outline'}
              size={18}
              color={isVoiceActive ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.voiceButtonText, isVoiceActive && styles.voiceButtonTextActive]}>
              {isVoiceActive ? 'Audio ON' : 'Taglish Voice'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => {
            const isBot = item.sender === 'bot';
            return (
              <View
                key={item.id}
                style={[styles.messageBubbleWrapper, isBot ? styles.botWrapper : styles.userWrapper]}
              >
                {isBot && (
                  <View style={styles.smallAvatar}>
                    <Ionicons name="flash" size={14} color={COLORS.white} />
                  </View>
                )}

                <View
                  style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}
                >
                  <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
                    {item.text}
                  </Text>

                  {/* Embedded Interactive Bill Card */}
                  {item.hasBillCard && (
                    <View style={styles.embeddedBillCard}>
                      <View style={styles.billCardHeader}>
                        <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.billCardTitle}>Bill Shock Summary (Nov 2026)</Text>
                      </View>

                      <View style={styles.billComparisonRow}>
                        <View>
                          <Text style={styles.billCompLabel}>Last Month</Text>
                          <Text style={styles.billCompPrev}>₱{MOCK_BILL_BREAKDOWN.lastMonthTotal}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                        <View>
                          <Text style={styles.billCompLabel}>Projected Now</Text>
                          <Text style={styles.billCompCurr}>₱{MOCK_BILL_BREAKDOWN.currentBillTotal}</Text>
                        </View>
                        <View style={styles.spikePill}>
                          <Text style={styles.spikePillText}>+₱{MOCK_BILL_BREAKDOWN.difference}</Text>
                        </View>
                      </View>

                      <View style={styles.billComponentList}>
                        {MOCK_BILL_BREAKDOWN.components.map((comp, idx) => (
                          <View key={idx} style={styles.billCompLine}>
                            <Text style={styles.billCompLineLabel}>{comp.label}</Text>
                            <Text style={styles.billCompLineValue}>
                              ₱{comp.amount.toFixed(2)} ({comp.percent}%)
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.quickPromptContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptScroll}
          >
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.promptChip}
                onPress={() => handleSend(prompt)}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.micButton}
            onPress={() =>
              Alert.alert(
                '🎙️ Voice Input (Speech-to-Text)',
                'Magsalita sa Taglish: "Bakit mataas ang kuryente ko ngayon?"'
              )
            }
          >
            <Ionicons name="mic-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Tanungin si Ate KuryenTipid sa Taglish..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim()}
            onPress={() => handleSend()}
          >
            <Ionicons name="send" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  botProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.success,
    marginLeft: 6,
  },
  botRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  voiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  voiceButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 4,
  },
  voiceButtonTextActive: {
    color: COLORS.white,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    maxWidth: '88%',
  },
  botWrapper: {
    alignSelf: 'flex-start',
  },
  userWrapper: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  smallAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  botBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: COLORS.textPrimary,
  },
  userText: {
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  botTimestamp: {
    color: COLORS.textMuted,
  },
  userTimestamp: {
    color: '#BFDBFE',
  },
  embeddedBillCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  billCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  billComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  billCompLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  billCompPrev: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  billCompCurr: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  spikePill: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spikePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.danger,
  },
  billComponentList: {
    gap: 4,
  },
  billCompLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billCompLineLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    paddingRight: 6,
  },
  billCompLineValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quickPromptContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickPromptScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  promptChip: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptChipText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
});

