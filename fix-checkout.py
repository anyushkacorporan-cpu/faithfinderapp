import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/event-checkout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove all 3 duplicate email blocks + their dividers
email_block = """
          <View style={s.divider} />

          {/* Email */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Contact Email</Text>
            <TextInput
              style={[s.input, emailError ? {borderColor:COLORS.red} : {}]}
              placeholder="Enter your email address"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); setEmailError(''); }}
            />
            {!!emailError && <Text style={{color:COLORS.red,fontSize:12,marginTop:4}}>{emailError}</Text>}
          </View>"""

count_before = content.count('Contact Email')
while '/* Email */' in content:
    start = content.find('\n          <View style={s.divider} />\n\n          {/* Email */}')
    if start == -1:
        break
    end = content.find('\n          </View>', start + 100)
    end = content.find('\n', end + 1)
    content = content[:start] + content[end:]

count_after = content.count('Contact Email')
print(f'Email blocks: {count_before} -> {count_after}')

# Step 2: Add ONE clean email field after ticket quantity
old_after_qty = """          <View style={s.divider} />

          {/* Order Summary */}"""

new_after_qty = """          <View style={s.divider} />

          {/* Contact Email */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Contact Email</Text>
            <TextInput
              style={[s.input, emailError ? {borderColor:COLORS.red} : {}]}
              placeholder="Enter your email address"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); setEmailError(''); }}
            />
            {!!emailError && <Text style={{color:COLORS.red,fontSize:12,marginTop:4}}>{emailError}</Text>}
          </View>

          <View style={s.divider} />

          {/* Order Summary */}"""

if old_after_qty in content:
    content = content.replace(old_after_qty, new_after_qty, 1)
    print('Email field added once')
else:
    print('WARNING: order summary divider not found')

# Step 3: Hide payment section and platform fee for free events
# Wrap Order Summary to hide platform fee for free events
old_platform_fee = """            <View style={s.orderRow}>
              <Text style={s.orderLbl}>Platform Fee</Text>
              <Text style={s.orderVal}>${platformFee.toFixed(2)}</Text>
            </View>"""

new_platform_fee = """            {ticketPrice > 0 && (
              <View style={s.orderRow}>
                <Text style={s.orderLbl}>Platform Fee</Text>
                <Text style={s.orderVal}>${platformFee.toFixed(2)}</Text>
              </View>
            )}"""

content = content.replace(old_platform_fee, new_platform_fee)

# Fix total to show $0.00 for free events
old_total_val = """              <Text style={s.orderTotalVal}>${total.toFixed(2)}</Text>"""
new_total_val = """              <Text style={s.orderTotalVal}>{ticketPrice > 0 ? '$' + total.toFixed(2) : 'Free'}</Text>"""
content = content.replace(old_total_val, new_total_val)

# Step 4: Wrap entire payment section (Terms + Pay With) to only show for paid events
# Find Terms section start
terms_start = content.find('          <View style={s.divider} />\n\n          {/* Terms */')
if terms_start != -1:
    # Find footer start  
    footer_start = content.find('\n      {/* Bottom bar */')
    if footer_start != -1:
        paid_section = content[terms_start:footer_start]
        new_paid_section = """
          {ticketPrice > 0 && (<>""" + paid_section + """
          </>)}

          {ticketPrice === 0 && (
            <View style={s.section}>
              <View style={s.agreeRow}>
                <TouchableOpacity style={[s.checkbox, agreed && s.checkboxChecked]} onPress={() => setAgreed(a => !a)}>
                  {agreed && <Ionicons name="checkmark" size={13} color={COLORS.white}/>}
                </TouchableOpacity>
                <Text style={s.agreeTxt}>I agree to FaithFinder's Terms of Service and Privacy Policy.</Text>
              </View>
            </View>
          )}

          <View style={{height:120}} />
"""
        content = content[:terms_start] + new_paid_section + content[footer_start:]
        print('Payment section conditioned for paid only')
    else:
        print('WARNING: footer not found')
else:
    print('WARNING: terms section not found')

# Step 5: Update footer for free events
old_footer_pay = """        {paymentMethod === 'apple' ? (
          <TouchableOpacity
            style={[s.applePayBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.white} />
            <Text style={s.applePayBtnTxt}>{processing ? 'Processing...' : 'Pay'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'paypal' ? (
          <View style={s.paypalBtns}>
            <TouchableOpacity style={[s.paypalBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Text style={s.paypalBtnTxt}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payLaterBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Ionicons name="logo-paypal" size={14} color={COLORS.white} />
              <Text style={s.payLaterBtnTxt}>Pay Later</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.payNowBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Pay Now'}</Text>
          </TouchableOpacity>
        )}"""

new_footer_pay = """        {ticketPrice === 0 ? (
          <TouchableOpacity
            style={[s.payNowBtn, (!agreed || processing) && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!agreed || processing}
          >
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Complete Registration'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'apple' ? (
          <TouchableOpacity
            style={[s.applePayBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.white} />
            <Text style={s.applePayBtnTxt}>{processing ? 'Processing...' : 'Pay'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'paypal' ? (
          <View style={s.paypalBtns}>
            <TouchableOpacity style={[s.paypalBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Text style={s.paypalBtnTxt}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payLaterBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Ionicons name="logo-paypal" size={14} color={COLORS.white} />
              <Text style={s.payLaterBtnTxt}>Pay Later</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.payNowBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Pay Now'}</Text>
          </TouchableOpacity>
        )}"""

if old_footer_pay in content:
    content = content.replace(old_footer_pay, new_footer_pay)
    print('Footer updated for free events')
else:
    print('WARNING: footer pay not found')

# Step 6: Fix footer total for free events
old_footer_total = """          <Text style={s.footerTotal}>${total.toFixed(2)}</Text>"""
new_footer_total = """          <Text style={s.footerTotal}>{ticketPrice > 0 ? '$' + total.toFixed(2) : 'Free'}</Text>"""
content = content.replace(old_footer_total, new_footer_total)

# Step 7: Fix handlePay for free events (don't require payment method)
old_can_pay = "  const canPay = agreed && (paymentMethod !== 'card' || cardComplete);"
new_can_pay = "  const canPay = agreed && (ticketPrice === 0 || paymentMethod !== 'card' || cardComplete);"
content = content.replace(old_can_pay, new_can_pay)

# Step 8: Fix button text on event cards - Register for free, Get Ticket for paid
with open('app/(tabs)/events.tsx', 'r', encoding='utf-8') as f:
    events = f.read()

# Fix both instances in events.tsx
events = events.replace(
    "{event.price==='Free'?'Register':'Get Ticket'}",
    "{event.price==='Free'?'Register':'Get Ticket'}"
)

with open('app/(tabs)/events.tsx', 'w', encoding='utf-8') as f:
    f.write(events)

with open('app/event-checkout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nFinal check:')
print('Contact Email count:', content.count('Contact Email'))
print('ticketPrice === 0:', content.count('ticketPrice === 0'))
print('ALL DONE')
