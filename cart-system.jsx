"use client"

import React from "react"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingBag, X, Minus, Plus, Trash2, ArrowLeft, CreditCard, Check } from "lucide-react"

// -----------------------------------------------
// CART CONTEXT
// -----------------------------------------------

// Create the cart context
const CartContext = createContext()

// Custom hook to use the cart context
export function useCart() {
  return useContext(CartContext)
}

// Cart provider component
export function CartProvider({ children }) {
  // Initialize cart from localStorage if available, otherwise empty array
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Load cart from localStorage on component mount
  useEffect(() => {
    const storedCart = localStorage.getItem("cart")
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart))
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error)
        setCartItems([])
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  // Add item to cart
  const addToCart = (item) => {
    // Check if item already exists in cart
    const existingItemIndex = cartItems.findIndex((cartItem) => cartItem.id === item.id)

    if (existingItemIndex >= 0) {
      // Item exists, update quantity
      const updatedCart = [...cartItems]
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + 1,
      }
      setCartItems(updatedCart)
    } else {
      // Item doesn't exist, add new item
      setCartItems([...cartItems, { ...item, quantity: 1 }])
    }

    // Open cart drawer when adding item
    setIsCartOpen(true)
  }

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId))
  }

  // Update item quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCartItems(cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)))
  }

  // Clear cart
  const clearCart = () => {
    setCartItems([])
  }

  // Calculate total price
  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.discountPrice * item.quantity, 0)
  }

  // Get total number of items in cart
  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0)
  }

  // Toggle cart visibility
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen)
  }

  // Value to be provided to consumers
  const value = {
    cartItems,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getItemCount,
    toggleCart,
    setIsCartOpen,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <Toaster />
    </CartContext.Provider>
  )
}

// -----------------------------------------------
// CART BUTTON COMPONENT
// -----------------------------------------------

export function CartButton() {
  const { toggleCart, getItemCount } = useCart()
  const itemCount = getItemCount()

  return (
    <Button variant="outline" size="icon" onClick={toggleCart} className="relative" aria-label="Open cart">
      <ShoppingBag className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-green-600">
          {itemCount}
        </Badge>
      )}
    </Button>
  )
}

// -----------------------------------------------
// CART DRAWER COMPONENT
// -----------------------------------------------

export function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getTotalPrice, getItemCount } =
    useCart()

  // Close cart when clicking outside
  const cartRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target) && isCartOpen) {
        setIsCartOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isCartOpen, setIsCartOpen])

  // Prevent scrolling when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div
        ref={cartRef}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-xl p-4 flex flex-col animate-in slide-in-from-right"
      >
        {/* Cart header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-xl font-bold">Your Cart</h2>
            <Badge variant="outline" className="ml-2">
              {getItemCount()} items
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} aria-label="Close cart">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Cart items */}
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Your cart is empty</p>
            <p className="text-muted-foreground text-center mb-6">
              Looks like you haven't added any surprise bags to your cart yet.
            </p>
            <Button onClick={() => setIsCartOpen(false)} className="bg-green-600 hover:bg-green-700">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 py-2">
                    {/* Item image */}
                    <div className="relative h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.storeName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Item details */}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{item.storeName}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.storeName} from cart`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground">{item.description}</p>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-medium">₹{item.discountPrice}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            {/* Cart summary */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold">₹{getTotalPrice()}</span>
              </div>

              <Link href="/cart" className="block w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsCartOpen(false)}>
                  View Cart
                </Button>
              </Link>

              <Link href="/checkout" className="block w-full">
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------
// CART PAGE COMPONENT
// -----------------------------------------------

export function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart()

  const isEmpty = cartItems.length === 0

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          Your Cart
          {!isEmpty && (
            <Badge variant="outline" className="ml-2">
              {cartItems.reduce((count, item) => count + item.quantity, 0)} items
            </Badge>
          )}
        </h1>

        {!isEmpty && (
          <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
            Clear Cart
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted rounded-full p-6 mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Looks like you haven't added any surprise bags to your cart yet. Go back to the homepage to discover amazing
            deals!
          </p>
          <Link href="/">
            <Button className="bg-green-600 hover:bg-green-700">Browse Surprise Bags</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.id}>
                      <div className="flex gap-4">
                        {/* Item image */}
                        <div className="relative h-24 w-24 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.storeName}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Item details */}
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-lg">{item.storeName}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Remove ${item.storeName} from cart`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <span>{item.pickupTime}</span>
                            <span>•</span>
                            <span>Feeds {item.servings}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="text-sm line-through text-muted-foreground">₹{item.originalPrice}</p>
                              <p className="font-bold">₹{item.discountPrice}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>₹0</span>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{getTotalPrice()}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Link href="/checkout" className="block w-full">
                    <Button className="w-full bg-green-600 hover:bg-green-700">Proceed to Checkout</Button>
                  </Link>

                  <Link href="/" className="block w-full">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  )
}

// -----------------------------------------------
// CHECKOUT PAGE COMPONENT
// -----------------------------------------------

export function CheckoutPage() {
  const router = useRouter()
  const { cartItems, getTotalPrice, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    paymentMethod: "card",
    specialInstructions: "",
    dietaryPreferences: "",
  })

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle radio button changes
  const handleRadioChange = (value) => {
    setFormData((prev) => ({ ...prev, paymentMethod: value }))
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      clearCart()

      // Show success toast
      toast({
        title: "Order placed successfully!",
        description: "Your order has been placed. You will receive a confirmation shortly.",
        duration: 5000,
      })

      // Redirect to confirmation page
      router.push("/order-confirmation")
    }, 1500)
  }

  // If cart is empty, redirect to cart page
  if (cartItems.length === 0) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-medium mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            You need to add items to your cart before proceeding to checkout.
          </p>
          <Link href="/">
            <Button className="bg-green-600 hover:bg-green-700">Browse Surprise Bags</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/cart" className="inline-flex items-center text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to cart
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      placeholder="Enter your street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        placeholder="Enter your city"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">PIN Code</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        required
                        placeholder="Enter your PIN code"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Preferences & Special Instructions</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dietaryPreferences">Dietary Preferences</Label>
                    <Input
                      id="dietaryPreferences"
                      name="dietaryPreferences"
                      value={formData.dietaryPreferences}
                      onChange={handleChange}
                      placeholder="E.g., Vegetarian, No nuts, Gluten-free, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialInstructions">Special Instructions</Label>
                    <Textarea
                      id="specialInstructions"
                      name="specialInstructions"
                      value={formData.specialInstructions}
                      onChange={handleChange}
                      placeholder="Any special requests or instructions for your order"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>

                <RadioGroup value={formData.paymentMethod} onValueChange={handleRadioChange} className="space-y-3">
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Credit/Debit Card
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="cursor-pointer">
                      UPI Payment
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="cursor-pointer">
                      Cash on Delivery
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="lg:hidden">
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{getTotalPrice()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span>₹0</span>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{getTotalPrice()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Place Order"}
            </Button>
          </form>
        </div>

        {/* Order summary */}
        <div className="hidden lg:block">
          <Card className="sticky top-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-4 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.storeName}</span>
                      <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                    </div>
                    <span>₹{item.discountPrice * item.quantity}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{getTotalPrice()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>₹0</span>
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{getTotalPrice()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-100">
                <div className="flex items-start">
                  <div className="bg-green-100 rounded-full p-1 mr-3 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Secure Checkout</p>
                    <p className="text-xs text-green-600">Your information is protected by secure encryption</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

// -----------------------------------------------
// UI COMPONENTS
// -----------------------------------------------

// Button component
export function Button({
  children,
  className = "",
  variant = "default",
  size = "default",
  disabled = false,
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"

  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  }

  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  }

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

// Card components
export function Card({ className, children, ...props }) {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

// Badge component
export function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Input component
export function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

// Label component
export function Label({ className, htmlFor, children, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}

// Textarea component
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

// RadioGroup components
export function RadioGroup({ className, value, onValueChange, children, ...props }) {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          checked: child.props.value === value,
          onChange: () => onValueChange(child.props.value),
        })
      })}
    </div>
  )
}

export function RadioGroupItem({ className, value, id, checked, onChange, ...props }) {
  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={checked}
      onChange={onChange}
      className={`h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary ${className}`}
      {...props}
    />
  )
}

// Separator component
export function Separator({ className, ...props }) {
  return <div className={`shrink-0 bg-border h-[1px] w-full ${className}`} {...props} />
}

// ScrollArea component (simplified)
export function ScrollArea({ className, children, ...props }) {
  return (
    <div className={`relative overflow-auto ${className}`} {...props}>
      {children}
    </div>
  )
}

// Toast components
const ToastContext = createContext({})

export function useToast() {
  return useContext(ToastContext)
}

export function Toaster() {
  const [toasts, setToasts] = useState([])

  const toast = ({ title, description, duration = 3000 }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, duration }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, duration)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-0 right-0 z-50 p-4 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-background border rounded-lg shadow-lg p-4 w-80 animate-in slide-in-from-right"
          >
            {toast.title && <h4 className="font-medium">{toast.title}</h4>}
            {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// -----------------------------------------------
// MODIFY FOOD BAG CARD TO ADD TO CART
// -----------------------------------------------

export function modifyFoodBagCard() {
  // This function returns the code needed to modify the FoodBagCard component
  // to add items to cart instead of showing an alert

  return `
"use client"

import Image from "next/image"
import { useState } from "react"
import { Users, ShoppingBag } from 'lucide-react'
import { useCart } from "@/context/cart-context"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

export function FoodBagCard({ bag }) {
  // State to track if the bag is currently being reserved
  const [isReserving, setIsReserving] = useState(false)
  
  // Get cart functions from context
  const { addToCart } = useCart()
  
  // Function to handle the reserve button click
  const handleReserve = () => {
    setIsReserving(true)
    
    // Add to cart
    setTimeout(() => {
      addToCart(bag)
      setIsReserving(false)
      
      // Show toast notification
      toast({
        title: "Added to cart!",
        description: \`\${bag.storeName} surprise bag has been added to your cart.\`,
        duration: 3000,
      })
    }, 500)
  }

  // Calculate discount percentage
  const discount = Math.round(((bag.originalPrice - bag.discountPrice) / bag.originalPrice) * 100)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image section with badges */}
      <div className="relative">
        <Image
          src={bag.imageUrl || "/placeholder.svg"}
          alt={bag.storeName}
          width={300}
          height={200}
          className="w-full h-40 object-cover"
        />
        {/* Discount badge */}
        <Badge className="absolute top-2 right-2 bg-green-600 hover:bg-green-700">
          Save {discount}%
        </Badge>
        
        {/* Limited quantity badge - only shows when quantity is low */}
        {bag.quantity <= 2 && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            Only {bag.quantity} left!
          </Badge>
        )}
      </div>
      
      {/* Card content with bag details */}
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          {/* Store name */}
          <h3 className="font-bold text-lg">{bag.storeName}</h3>
          
          {/* Number of servings */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Feeds {bag.servings}</span>
          </div>
        </div>
        
        {/* Bag description */}
        <p className="text-sm text-muted-foreground mb-2">{bag.description}</p>
        
        <div className="flex justify-between items-center">
          {/* Pickup time and distance */}
          <div>
            <p className="text-sm text-muted-foreground">{bag.pickupTime}</p>
            <p className="text-sm text-muted-foreground">{bag.distance} away</p>
          </div>
          
          {/* Price information */}
          <div className="text-right">
            <p className="text-sm line-through text-muted-foreground">₹{bag.originalPrice}</p>
            <p className="font-bold text-lg">₹{bag.discountPrice}</p>
          </div>
        </div>
      </CardContent>
      
      {/* Card footer with reserve button */}
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          onClick={handleReserve}
          disabled={isReserving}
        >
          <ShoppingBag className="h-4 w-4" />
          {isReserving ? "Adding to Cart..." : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  )
}
  `
}

// -----------------------------------------------
// USAGE INSTRUCTIONS
// -----------------------------------------------

/*
HOW TO USE THIS FILE:

1. Copy this entire file into your project
2. Import the necessary components in your pages:

   import { 
     CartProvider, 
     CartButton, 
     CartPage, 
     CheckoutPage 
   } from './path/to/cart-system.jsx'

3. Wrap your app with the CartProvider in your layout:

   export default function Layout({ children }) {
     return (
       <CartProvider>
         {children}
       </CartProvider>
     )
   }

4. Add the CartButton to your header/navigation:

   <header>
     <h1>Your App</h1>
     <CartButton />
   </header>

5. Create a cart page:

   // app/cart/page.jsx
   export default function Page() {
     return <CartPage />
   }

6. Create a checkout page:

   // app/checkout/page.jsx
   export default function Page() {
     return <CheckoutPage />
   }

7. Modify your FoodBagCard component using the code from modifyFoodBagCard()

This file includes all the necessary UI components, so you don't need to import them separately.
*/

