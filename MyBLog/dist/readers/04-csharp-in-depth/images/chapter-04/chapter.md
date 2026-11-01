# Chapter 4: Saying nothing with nullable types

> Source: C# in Depth, Third Edition — Jon Skeet. Original PDF pages 136–163.

[← Table of contents](../README.md)


<!-- PDF page 136 -->

## Saying nothing

## with nullable types

This chapter covers
Reasons for using null values
Framework and runtime support for nullable types
Language support in C# 2 for nullable types
Patterns using nullable types
Nullity is a concept that has provoked debate over the years. Is a null reference a
value, or the absence of a value? Is “nothing” a “something”? Should languages sup-
port the concept of nullity at all, or should it be represented in other patterns?
In this chapter, I’ll try to stay more practical than philosophical. First we’ll look
at why there’s a problem at all—why you can’t set a value type variable to null in C#
1 and what the traditional alternatives have been. After that, I’ll introduce you to
our knight in shining armor—System.Nullable<T>—and then we’ll look at how
C# 2 makes working with nullable types simple and compact. Like generics, nul-
lable types sometimes have uses beyond what you might expect, and we’ll look at a
few examples of these at the end of the chapter.
So, when is a value not a value? Let’s find out.


<!-- PDF page 137 -->

Saying nothing with nullable types
4.1
What do you do when you just don’t have a value?
The C# and .NET designers don’t add features just for kicks. There has to be a real,
significant problem that needs fixing before they’ll go as far as changing C# as a lan-
guage or .NET at the platform level. In this case, the problem is best summed up in
one of the most frequently asked questions in C# and .NET discussion groups:
I need to set my DateTime variable to null, but the compiler won’t let me. What should I do?1
It’s a question that comes up fairly naturally—an example might be in an e-commerce
application where users are looking at their account history. If an order has been
placed but not delivered, there may be a purchase date but no dispatch date, so how
would you represent that in a type that’s meant to provide the order details?
Before C# 2, the answer to the question usually came in two parts: an explanation
of why you couldn’t use null in the first place, and a list of which options were avail-
able. Nowadays the answer would usually explain nullable types instead, but it’s worth
looking at the C# 1 options to understand where the problem comes from.
4.1.1
Why value type variables can’t be null
As you saw in chapter 2, the value of a reference type variable is a reference, and the
value of a value type variable is the real data itself. A non-null reference is a way of get-
ting at an object, but null acts as a special value that means I don’t refer to any object.
If you want to think of references as being like URLs, null is (very roughly speak-
ing) the reference equivalent of about:blank. It’s represented as all zeroes in memory
(which is why it’s the default value for all reference types—clearing a whole block of
memory is cheap, so that’s the way objects are initialized), but it’s still basically stored
in the same way as other references. There’s no extra bit hidden somewhere for each
reference type variable. That means you can’t use the “all zeroes” value for a real refer-
ence, but that’s okay—your memory is going to run out long before you have that
many live objects anyway. This is the key to why null isn’t a valid value type value.
Let’s consider the byte type as a familiar one that’s easy to think about. The value
of a variable of type byte is stored in a single byte—it may be padded for alignment
purposes, but the value itself is conceptually only made up of one byte. You’ve got to
be able to store the values 0–255 in that variable; otherwise it’s useless for reading
arbitrary binary data. With the 256 normal values and one null value, you’d have to
cope with a total of 257 values, and there’s no way of squeezing that many values into a
single byte. The designers could’ve decided that every value type would have an extra
flag bit somewhere determining whether a value was null or contained real data, but
the memory usage implications are horrible, not to mention the fact that you’d have
to check the flag every time you wanted to use the value. In a nutshell, with value types
you often care about having the whole range of possible bit patterns available as real
1 It’s almost always DateTime rather than any other value type. I’m not entirely sure why—it’s as if developers
inherently understand why a byte shouldn’t be null, but feel that dates are more inherently nullable.


<!-- PDF page 138 -->

What do you do when you just don’t have a value?
values, whereas with reference types it’s okay to lose one potential value in order to
gain the benefits of making the null reference available.
That’s the usual situation. Now why would you want to be able to represent null
for a value type anyway? The most common reason is simply because databases typi-
cally support NULL as a value for every type (unless you specifically make the field non-
nullable), so you can have nullable character data, nullable integers, nullable Bool-
eans—the whole works. When you fetch data from a database, it’s generally not a good
idea to lose information, so you want to be able to represent the nullity of whatever
you read, somehow.
That just moves the question one step further on, though. Why do databases allow
null values for dates, integers, and the like? Null values are typically used for
unknown or missing values, such as the dispatch date in the earlier e-commerce
example. Nullity represents an absence of definite information, which can be impor-
tant in many situations. Indeed, there doesn’t have to be a database involved for nul-
lable value types to be useful; that’s just the scenario where developers typically
encounter the problem first.
That brings us to options for representing null values in C# 1.
4.1.2
Patterns for representing null values in C# 1
There are three basic patterns commonly used to get around the lack of nullable
value types in C# 1. Each has its pros and cons—mostly cons—and all of them are
fairly unsatisfying. But they’re worth knowing, partly to more fully appreciate the ben-
efits of the integrated solution in C# 2.
PATTERN 1: THE MAGIC VALUE
The first pattern is to sacrifice one value to represent a null value. This tends to be
used as the solution for DateTime; few people expect their databases to actually con-
tain dates in AD 1, so DateTime.MinValue can be used as a convenient magic value
without losing any useful data. In other words, it goes against the line of reasoning I
gave earlier, which assumes that every possible value needs to be available for normal
purposes. The semantic meaning of such a null value will vary from application to
application—it may mean that the user hasn’t entered the value into a form yet, or
that it’s not required for that record, for example.
The good news is that using a magic value doesn’t waste any memory or require any
new types. But it does rely on you picking an appropriate value that you’ll never want
to use for real data. Also, it’s basically inelegant. It just doesn’t feel right. If you ever
find yourself needing to go down this path, you should at least use a constant (or static
read-only value for types that can’t be expressed as constants) to represent the magic
value—comparisons with DateTime.MinValue everywhere, for instance, don’t express
the meaning of the magic value. Additionally, it’s easy to accidentally use the magic
value as if it were a normal, meaningful value—neither the compiler nor the runtime
will help you spot the error. In contrast, most of the other solutions presented here


<!-- PDF page 139 -->

Saying nothing with nullable types
(including the one in C# 2) would result in either a compilation error or an exception
at execution time, depending on the exact situation.
The magic value pattern is deeply embedded in computing in the form of IEEE-754
binary floating-point types such as float and double. These go further than the idea
of a single value representing this isn’t really a number—there are many bit patterns that
are classified as not-a-number (NaN), as well as values for positive and negative infin-
ity. I suspect few programmers (myself included) are as cautious around these values
as we should be, which is another indication of the pattern’s shortcomings.
ADO.NET has a variation on this pattern where the same magic value—
DBNull.Value—is used for all null values, regardless of the type. In this case, an extra
value and indeed an extra type have been introduced to indicate when a database has
returned null. But it’s only applicable where compile-time type safety isn’t important
(in other words, when you’re happy to use object and cast after testing for nullity),
and again it doesn’t feel quite right. In fact, it’s a mixture of the magic value pattern
and the reference type wrapper pattern, which we’ll look at next.
PATTERN 2: A REFERENCE TYPE WRAPPER
The second solution can take two forms. The simpler one is to use object as the vari-
able type, boxing and unboxing values as necessary. The more complex (and more
appealing) form is to have a reference type for each value type you need in a nullable
form, containing a single instance variable of that value type, and with implicit conver-
sion operators to and from the value type. With generics, you could do this in one
generic type, but if you’re using C# 2 anyway, you might as well use the nullable types
described in this chapter instead. If you’re stuck in C# 1, you have to create extra
source code for each type you want to wrap. This isn’t hard to put in the form of a
template for automatic code generation, but it’s still a burden that’s best avoided if
possible.
Both of these forms have the problem that though they allow you to use null
directly, they require objects to be created on the heap, which can lead to garbage col-
lection pressure if you need to use this approach frequently and adds memory use due
to the overhead associated with objects. For the more complex solution, you could
make the reference type mutable, which may reduce the number of instances you
need to create, but it could also make for some unintuitive code.
PATTERN 3: AN EXTRA BOOLEAN FLAG
The final pattern involves a normal value type value and another value—a Boolean
flag—indicating whether the value is “real” or whether it should be disregarded.
Again, there are two ways of implementing this solution. Either you could maintain
two separate variables in the code that uses the value, or you could encapsulate the
value-plus-flag into another value type.
This latter solution is quite similar to the more complicated reference type idea
described earlier, except that you avoid the garbage collection issue by using a value
type and indicate nullity within the encapsulated value rather than with a null refer-
ence. The downside of having to create a new one of these types for every value type


<!-- PDF page 140 -->

System.Nullable<T> and System.Nullable
you wish to handle is the same, though. Also, if the value is ever boxed for some rea-
son, it’ll be boxed in the normal way whether it’s considered to be null or not.
The last pattern (in the more encapsulated form) is effectively how nullable types
work in C# 2, although the new features of the framework, CLR, and language all com-
bine to provide a solution that’s significantly neater than anything that was possible in
C# 1. The next section deals with the support provided by the framework and the CLR
in .NET 2: if C# 2 only supported generics, most of section 4.2 would still be relevant
and the feature would still work and be useful. But C# 2 provides extra syntactic sugar
to make it even better—that’s the subject of section 4.3.
4.2
System.Nullable<T> and System.Nullable
The core structure at the heart of nullable types is the System.Nullable<T> struct. In
addition, the System.Nullable static class provides utility methods that occasionally
make nullable types easier to work with. (From now on I’ll leave out the namespace,
to make life simpler.) We’ll look at both of these types in turn, and for this section I’ll
avoid any extra features provided by the language, so you’ll be able to understand
what’s going on in the IL code when we do look at the shorthand provided by C# 2.
4.2.1
Introducing Nullable<T>
As you can tell by its name, Nullable<T> is a generic type. The type parameter T has a
value type constraint, so you can’t use Nullable<Stream>, for example. As I men-
tioned in section 3.3.1 this also means you can’t use another nullable type as the
argument, so Nullable<Nullable<int>> is forbidden, even though Nullable<T> is a
value type in every other way. The type of T for any particular nullable type is called
the underlying type of that nullable type. For example, the underlying type of
Nullable<int> is int.
The most important parts of Nullable<T> are its properties, HasValue and Value.
They do the obvious: Value represents the non-nullable value (the real one, if you
will), when there is one, and throws an InvalidOperationException if (conceptually)
there’s no real value. HasValue is a Boolean property indicating whether there’s a real
value or whether the instance should be regarded as null. For now, I’ll talk about an
“instance with a value” or an “instance without a value,” which mean an instance
where the HasValue property returns true or false, respectively.
These properties are backed by simple
fields in the obvious way. Figure 4.1 shows
instances of Nullable<int> representing
(from left to right) no value, 0, and 5.
Remember that Nullable<T> is still a
value type, so if you have a variable of type
Nullable<int>, the variable’s value will
directly contain a bool and an int—it
won’t be a reference to a separate object.
![Figure from PDF page 140](images/page-140-figure-0101.png)

![Figure from PDF page 140](images/page-140-figure-0102.png)

![Figure from PDF page 140](images/page-140-figure-0103.png)

hasValue
hasValue
hasValue
false
true
true
value
value
value
No value
(null)
Value of 0
Value of 5
Figure 4.1
Sample values of Nullable<int>


<!-- PDF page 141 -->

Saying nothing with nullable types
Now that you know what the properties should achieve, let’s look at how you can cre-
ate an instance of the type. Nullable<T> has two constructors: the default one (creat-
ing an instance without a value) and one taking an instance of T as the value. Once an
instance has been constructed, it’s immutable.
Value types and mutability
A type is said to be immutable if it’s designed so that an instance can’t be changed
after it’s been constructed. Immutable types often lead to a cleaner design than
you’d get if you had to keep track of what might be changing shared values—partic-
ularly among different threads.
Immutability is particularly important for value types; they should almost always be
immutable. Most value types in the framework are immutable, but there are some
commonly used exceptions—in particular, the Point structures for both Windows
Forms and Windows Presentation Foundation are mutable.
If you need a way of basing one value on another, follow the lead of DateTime and
TimeSpan—provide methods and operators that return a new value rather than mod-
ifying an existing one. This avoids all kinds of subtle bugs, including situations where
you may appear to be changing something, but you’re actually changing a copy. Just
say No to mutable value types.
Nullable<T> introduces a single new method, GetValueOrDefault, which has two
overloads. Both return the value of the instance if there is one, or a default value oth-
erwise. One overload doesn’t have any parameters (in which case the default value of
the underlying type is used), and the other allows you to specify the default value to
return if necessary.
The other methods implemented by Nullable<T> all override existing methods:
GetHashCode, ToString, and Equals. GetHashCode returns 0 if the instance doesn’t
have a value, or the result of calling GetHashCode on the value if there is one.
ToString returns an empty string if there isn’t a value, or the result of calling
ToString on the value if there is. Equals is slightly more complicated—we’ll come
back to it when we’ve discussed boxing.
Finally, two conversions are provided by the framework. First, there’s an implicit
conversion from T to Nullable<T>. This always results in an instance where HasValue
returns true. Likewise, there’s an explicit conversion from Nullable<T> to T, which
behaves exactly the same as the Value property, including throwing an exception
when there’s no real value to return.
WRAPPING AND UNWRAPPING
The C# specification names the process of con-
verting an instance of T to an instance of Nullable<T> wrapping, with the obvi-
ous opposite process being called unwrapping. The specification defines these
terms with reference to the constructor taking a parameter and the Value
property, respectively. Indeed, these calls are generated by the C# code even
when it otherwise looks as if you’re using the conversions provided by the


<!-- PDF page 142 -->

System.Nullable<T> and System.Nullable
framework. The results are the same either way, though. For the rest of this
chapter, I won’t distinguish between the two implementations available.
Before we go any further, let’s see all this in action. The following listing shows every-
thing you can do with Nullable<T> directly, leaving Equals aside for the moment.
Listing 4.1
Using various members of Nullable<T>
static void Display(Nullable<int> x)
{
Console.WriteLine("HasValue: {0}", x.HasValue);
if (x.HasValue)
{
Console.WriteLine("Value: {0}", x.Value);
Console.WriteLine("Explicit conversion: {0}", (int)x);
}
Console.WriteLine("GetValueOrDefault(): {0}",
x.GetValueOrDefault());
Console.WriteLine("GetValueOrDefault(10): {0}",
x.GetValueOrDefault(10));
Console.WriteLine("ToString(): \"{0}\"", x.ToString());
Console.WriteLine("GetHashCode(): {0}", x.GetHashCode());
Console.WriteLine();
}
...
Nullable<int> x = 5;
x = new Nullable<int>(5);
Console.WriteLine("Instance with value:");
Display(x);
Displays
diagnostics
B
Wraps
value of 5
C
x = new Nullable<int>();
Console.WriteLine("Instance without value:");
Display(x);
Constructs instance
without value
D
In listing 4.1, you first use the two different ways (in terms of C# source code) of wrap-
ping a value of the underlying type C, and then you use various different members on
the instance B. Next, you create an instance that doesn’t have a value D and use the
same members in the same order, just omitting the Value property and the explicit
conversion to int, because these would throw exceptions.
The output of listing 4.1 is as follows:
Instance with value:
HasValue: True
Value: 5
Explicit conversion: 5
GetValueOrDefault(): 5
GetValueOrDefault(10): 5
ToString(): "5"
GetHashCode(): 5
Instance without value:
HasValue: False
GetValueOrDefault(): 0
GetValueOrDefault(10): 10


<!-- PDF page 143 -->

Saying nothing with nullable types
ToString(): ""
GetHashCode(): 0
So far, you could probably have predicted all of the results by looking at the members
provided by Nullable<T>. When it comes to boxing and unboxing, though, there’s
special behavior to make nullable types behave how you’d really like them to behave,
rather than how they’d behave if you slavishly followed the normal boxing rules.
4.2.2
Boxing Nullable<T> and unboxing
It’s important to remember that Nullable<T> is a struct—a value type. This means
that if you want to convert it to a reference type (object is the most obvious example),
you’ll need to box it. It’s only with respect to boxing and unboxing that the CLR has
any special behavior regarding nullable types—the rest is standard generics, conver-
sions, method calls, and so forth. In fact, the behavior was only changed shortly before
the release of .NET 2.0, as the result of community requests. In the preview releases,
nullable value types were boxed just like
any other value types.
An instance of Nullable<T> is boxed
to either a null reference (if it doesn’t
have a value) or a boxed value of T (if it
does), as shown in figure 4.2. It never
boxes to a “boxed nullable int”—there’s
no such type.
You can unbox from a boxed value
either to its normal type or to the corre-
sponding nullable type. Unboxing a null
reference will throw a NullReference-
Exception if you unbox to the normal
type, but will unbox to an instance without
a value if you unbox to the appropriate
nullable type. This behavior is shown in
the following listing.
Nullable<int>
![Figure from PDF page 143](images/page-143-figure-0104.png)

hasValue
false
false
Boxing
value
null reference
Nullable<int>
![Figure from PDF page 143](images/page-143-figure-0105.png)

hasValue
true
Boxed int
reference
Boxing
value
Figure 4.2
Results of boxing an instance
without a value (top) and with a value (bottom)
Listing 4.2
Boxing and unboxing behavior of nullable types
Nullable<int> nullable = 5;
Boxes nullable
with value
object boxed = nullable;
Console.WriteLine(boxed.GetType());
Unboxes to non-
nullable variable
int normal = (int)boxed;
Console.WriteLine(normal);
Unboxes to
nullable variable
nullable = (Nullable<int>)boxed;
Console.WriteLine(nullable);
nullable = new Nullable<int>();
boxed = nullable;
Boxes nullable
without value


<!-- PDF page 144 -->

System.Nullable<T> and System.Nullable
Console.WriteLine(boxed == null);
nullable = (Nullable<int>)boxed;
Console.WriteLine(nullable.HasValue);
Unboxes to nullable variable
The output of listing 4.2 shows the type of the boxed value as System.Int32 (not
System.Nullable<System.Int32>). This confirms that you can retrieve the value by
unboxing to either int or to Nullable<int>. Finally, the output demonstrates that
you can box from a nullable instance without a value to a null reference and success-
fully unbox again to another valueless nullable instance. If you’d tried unboxing the
last value of boxed to a non-nullable int, the program would’ve blown up with a Null-
ReferenceException.
Now that you understand the behavior of boxing and unboxing, we can begin to
tackle the behavior of Nullable<T>.Equals.
4.2.3
Equality of Nullable<T> instances
Nullable<T> overrides object.Equals(object) but doesn’t introduce any equality
operators or provide an Equals(Nullable<T>) method. Because the framework has
supplied the basic building blocks, languages can add extra functionality on top,
including making existing operators work as you’d expect them to. You’ll see the
details of that in section 4.3.3, but the basic equality, as defined by the vanilla Equals
method, follows these rules for a call to first.Equals(second):
If first has no value and second is null, they’re equal.
If first has no value and second isn’t null, they aren’t equal.
If first has a value and second is null, they aren’t equal.
Otherwise, they’re equal if first’s value is equal to second.
Note that you don’t have to consider the case where second is another Nullable<T>
because the rules of boxing prohibit that situation. The type of second is object, so in
order to be a Nullable<T>, it would have to be boxed, and as you’ve just seen, boxing
a nullable instance creates a box of the non-nullable type or returns a null reference.
Initially, the first rule may appear to be breaking the contract for object
.Equals(object), which insists that x.Equals(null) returns false—but that’s only
when x is a non-null reference. Again, due to the boxing behavior, Nullable<T>’s
implementation will never be called via a reference.
The rules are mostly consistent with the rules of equality elsewhere in .NET, so you
can use nullable instances as keys for dictionaries and any other situations where you
need equality. Just don’t expect equality to differentiate between a non-nullable
instance and a nullable instance with a value—it’s been carefully set up so that those
two cases are treated the same way as each other.
That covers the Nullable<T> structure itself, but it has a shadowy partner: the
Nullable class.


<!-- PDF page 145 -->

Saying nothing with nullable types
4.2.4
Support from the nongeneric Nullable class
The System.Nullable<T> struct does almost everything you want it to, but it gets help
from the System.Nullable class. This is a static class—it only contains static methods,
and you can’t create an instance of it.2 In fact, everything it does could’ve been done
equally well by other types, and if Microsoft had shown more foresight, the Nullable
class might not have even existed—which would’ve saved some confusion over what
the two types are there for. But this accident of history has three methods to its name,
and they’re still useful.
The first two are comparison methods:
public static int Compare<T>(Nullable<T> n1, Nullable<T> n2)
public static bool Equals<T>(Nullable<T> n1, Nullable<T> n2)
Compare uses Comparer<T>.Default to compare the two underlying values (if they
exist), and Equals uses EqualityComparer<T>.Default. When presented with
instances with no values, the results returned from each method comply with the .NET
conventions of nulls comparing equal to each other and less than anything else.
Both of these methods could happily be part of Nullable<T> as static but nonge-
neric methods. The one small advantage of having them as generic methods in a non-
generic type is that generic type inference can be applied, so you’ll rarely need to
explicitly specify the type parameter.
The final method of System.Nullable isn’t generic—it couldn’t be. Its signature is
as follows:
public static Type GetUnderlyingType(Type nullableType)
If the parameter is a nullable type, the method returns its underlying type; otherwise
it returns null. The reason this couldn’t be a generic method is that if you knew the
underlying type to start with, you wouldn’t have to call it.
You’ve now seen what the framework and the CLR provide to support nullable
types—but C# 2 adds language features to make life a lot more pleasant.
4.3
C# 2’s syntactic sugar for nullable types
So far you’ve seen nullable types doing their jobs, but the examples haven’t been par-
ticularly pretty to look at. Admittedly it’s clear that you’re using nullable types when
you have to type Nullable<> around the name of the type you’re interested in, but
that makes the nullability more prominent than the underlying type, which is usually
not a good idea.
In addition, the very name nullable suggests that you should be able to assign null
to a variable of a nullable type, and you haven’t seen that—you’ve always used the
default constructor of the type. In this section, we’ll look at how C# 2 deals with these
issues and others.
2 You’ll learn more about static classes in chapter 7.


<!-- PDF page 146 -->

C# 2’s syntactic sugar for nullable types
Before we get into the details of what C# 2 provides as a language, there’s one def-
inition I can finally introduce. The null value of a nullable value type is the value
where HasValue returns false—or an “instance without a value,” as I referred to it in
section 4.2. I didn’t use the term before because it’s specific to C#. The CLI specifica-
tion doesn’t mention it, and the documentation for Nullable<T> itself doesn’t men-
tion it. I’ve honored that difference by waiting until we’re specifically talking about
C# 2 before introducing the term. The term also applies to reference types: the null
value of a reference type is simply the null reference you’re familiar with from C# 1.
NULLABLE TYPE VERSUS NULLABLE VALUE TYPE
In the C# language specifica-
tion, nullable type is used to mean any type with a null value—so any reference
type, or any Nullable<T>. You may have noticed that I’ve been using this term
as if it were synonymous with nullable value type (which obviously doesn’t
include reference types). Although I’m usually a huge pedant when it comes
to terminology, if I’d used “nullable value type” everywhere in this chapter, it
would’ve been horrible to read. You should also expect “nullable type” to be
used ambiguously in the real world: it’s probably more common to use it when
describing Nullable<T> than in the sense described in the specification.
With that out of the way, let’s see what features C# 2 gives us, starting by reducing the
clutter in our code.
4.3.1
The ? modifier
There are some elements of syntax that may be unfamiliar at first but that have an
appropriate feel to them. The conditional operator (a ? b : c) is one of them for me—
it asks a question and then has two corresponding answers. In the same way, the ?
modifier for nullable types just feels right.
The ? modifier is a shorthand way of specifying a nullable type, so instead of using
Nullable <byte>, you can use byte? throughout your code. The two are interchange-
able and compile to exactly the same IL, so you can mix and match them if you want
to—but on behalf of whoever reads your code next, I urge you to pick one way or the
other and use it consistently. The following listing is exactly equivalent to listing 4.2
but uses the ? modifier, as shown in bold.
Listing 4.3
The same code as 4.2 but using the ? modifier
int? nullable = 5;
object boxed = nullable;
Console.WriteLine(boxed.GetType());
int normal = (int)boxed;
Console.WriteLine(normal);
nullable = (int?)boxed;
Console.WriteLine(nullable);
nullable = new int?();


<!-- PDF page 147 -->

Saying nothing with nullable types
boxed = nullable;
Console.WriteLine(boxed == null);
nullable = (int?)boxed;
Console.WriteLine(nullable.HasValue);
I won’t go through what the code does or how it does it, because the result is exactly
the same as in listing 4.2. The two listings compile down to the same IL—they simply
use different syntax, just as int is interchangeable with System.Int32. You can use the
shorthand version everywhere, including in method signatures, typeof expressions,
casts, and the like.
The reason I feel the modifier is well chosen is that it adds an air of uncertainty to
the nature of the variable. Does the variable nullable in listing 4.3 have an integer
value? Well, at any particular time it might, or it might be the null value.
From now on, I’ll use the ? modifier in all the examples—it’s neater, and it’s argu-
ably the idiomatic way to use nullable types in C#. But you may feel that it’s too easy to
miss when reading the code, in which case there’s nothing to stop you from using the
longer syntax. You might want to compare the listings in this and the previous section
to see which you find more clear.
Given that the C# 2 specification defines the null value, it would be odd if we
couldn’t use the null literal that’s already in the language to represent it. Fortunately
we can…
4.3.2
Assigning and comparing with null
A concise author could cover this whole section in a single sentence: “The C# com-
piler allows the use of null to represent the null value of a nullable type in both com-
parisons and assignments.” I prefer to show you what it means in real code and to
consider why the language has been given this feature.
You may have felt uncomfortable every time you used the default constructor of
Nullable<T>. It achieves the desired behavior, but it doesn’t express the reason why
you want to do it—it doesn’t leave the right impression with the reader. It should ide-
ally give the same sort of feeling that using null does with reference types.
If it seems odd to you that I’ve talked about feelings in both this section and the
previous one, just think about who writes code and who reads it. Sure, the compiler
has to understand the code, and it couldn’t care less about the subtle nuances of style,
but few pieces of code used in production systems are written and then never read
again. Anything you can do to get the reader into the mental process you were going
through when you originally wrote the code is good, and using the familiar null lit-
eral helps to achieve that.
With that in mind, we’ll switch from using an example that just shows syntax and
behavior to one that gives an impression of how nullable types might be used. We’ll
model a Person class where you need to know a person’s name, date of birth, and date
of death. We’ll only keep track of people who have definitely been born, but some of
those people may still be alive—in which case the date of death will be represented by


<!-- PDF page 148 -->

C# 2’s syntactic sugar for nullable types
null. The following listing shows some of the possible code. A real class would have
more operations available—we’ll just look at the calculation of age for this example.
Listing 4.4
Part of a Person class including calculation of age
class Person
{
DateTime birth;
DateTime? death;
string name;
public TimeSpan Age
{
get
{
if (death == null)
{
return DateTime.Now - birth;
}
else
{
return death.Value - birth;
}
}
}
Checks HasValue
B
Unwraps for calculation
C
public Person(string name,
DateTime birth,
DateTime? death)
{
this.birth = birth;
this.death = death;
this.name = name;
}
}
...
Person turing = new Person("Alan Turing ",
new DateTime(1912, 6, 23),
new DateTime(1954, 6, 7));
Person knuth = new Person("Donald Knuth ",
new DateTime(1938, 1, 10),
null);
Wraps DateTime
as nullable
D
Specifies null
date of death
E
Listing 4.4 doesn’t produce any output, but the fact that it compiles might have sur-
prised you before reading this chapter. Apart from the use of the ? modifier causing
confusion, you might have found it odd that you could compare a DateTime? with
null or pass null as the argument for a DateTime? parameter.
Hopefully by now the meaning is intuitive—when you compare the death variable
with null, you’re asking whether its value is the null value or not. Likewise when you use
null as a DateTime? instance, you’re really creating the null value for the type by calling
the default constructor. Indeed, you can see in the generated IL that the code the com-
piler spits out for listing 4.4 really does just call the death.HasValue property B and
create a new instance of DateTime? E using the default constructor (represented in IL


<!-- PDF page 149 -->

Saying nothing with nullable types
as the initobj instruction). The date of Alan Turing’s death D is created by calling the
normal DateTime constructor and then passing the result into the Nullable <Date-
Time> constructor that takes a parameter.
I mention looking at the IL because that can be a useful way of finding out what
your code is actually doing, particularly if something compiles when you don’t expect
it to. You can use the ildasm tool that comes with the .NET SDK, or one of the many
decompilers now available, such as .NET Reflector, ILSpy, dotPeek, or JustDecompile.
(Whenever I refer to Reflector in this book, it’s solely because that’s the tool I use out
of habit. The others are perfectly fine too, I’m sure.)
You’ve seen how C# provides shorthand syntax for the concept of a null value,
making the code more expressive once nullable types are understood in the first
place. But one part of listing 4.4 took a bit more work than you might have hoped—
the subtraction at C. Why did you have to unwrap the value? Why couldn’t you just
return death - birth directly? What would you want that expression to mean if death
had been null (excluded in this code by the earlier test)? These questions—and
more—are answered in the next section.
4.3.3
Nullable conversions and operators
You’ve seen that you can compare instances of nullable types with null, but there are
other comparisons that can be made and other operators that can be used in some
cases. Likewise you’ve seen wrapping and unwrapping, but other conversions can be
used with some types. This section explains what’s available. I’m afraid it’s pretty much
impossible to make this kind of topic genuinely exciting, but carefully designed fea-
tures like these are what make C# a pleasant language to work with in the long run.
Don’t worry if not all of it sinks in the first time through: just remember that the
details are here if you need to refer to them in the middle of a coding session.
The executive summary is that if there’s an operator or conversion available on a
non-nullable value type, and that operator or conversion only involves other non-
nullable value types, then the nullable value type also has the same operator or con-
version available, usually converting the non-nullable value types into their nullable
equivalents. To give a more concrete example, there’s an implicit conversion from int
to long, and that means there’s also an implicit conversion from int? to long? that
behaves in the obvious manner.
Unfortunately, although that broad description gives the right general idea, the
exact rules are slightly more complicated. Each rule is simple, but there are quite a
few of them. It’s worth knowing about them because otherwise you might end up star-
ing at a compiler error or warning for a while, wondering why it believes you’re trying
to make a conversion that you never intended in the first place. We’ll start with the
conversions and then look at the operators.


<!-- PDF page 150 -->

C# 2’s syntactic sugar for nullable types
CONVERSIONS INVOLVING NULLABLE TYPES
For completeness, let’s start with the conversions you already know about:
An implicit conversion from the null literal to T?
An implicit conversion from T to T?
An explicit conversion from T? to T
Now consider the predefined and user-defined conversions available on types. For
instance, there’s a predefined conversion from int to long. For any conversion like
this, from one non-nullable value type (S) to another (T), the following conversions
are also available:

S? to T? (explicit or implicit depending on original conversion)

S to T? (explicit or implicit depending on original conversion)

S? to T (always explicit)
To carry the example forward, this means that you can convert implicitly from int? to
long? and from int to long? as well as explicitly from int? to long. The conversions
behave in the natural way, with null values of S? converting to null values of T?, and
non-null values using the original conversion. As before, the explicit conversion from
S? to T will throw an InvalidOperationException when converting from a null value
of S?. For user-defined conversions, these extra conversions involving nullable types
are known as lifted conversions.
So far, so relatively simple. Now let’s consider the operators, where things are
slightly more tricky.
OPERATORS INVOLVING NULLABLE TYPES
C# allows the following operators to be overloaded:3
Unary: + ++ - -- ! ~ truefalse
Binary: + - * / % & | ^ << >>
Equality: == !=
Relational: < > <= >=
When these operators are overloaded for a non-nullable value type T, the nullable type
T? has the same operators, with slightly different operand and result types. These are
called lifted operators, whether they’re predefined operators such as addition on
numeric types or user-defined operators such as adding a TimeSpan to a DateTime.
There are a few restrictions as to when they apply:
The true and false operators are never lifted. They’re incredibly rare in the
first place, though, so it’s no great loss.
Only operators with non-nullable value types for the operands are lifted.
3 The equality and relational operators are also binary operators, but they behave slightly differently than the
others; hence their separation in this list.


<!-- PDF page 151 -->

Saying nothing with nullable types
For the unary and binary operators (other than equality and relational opera-
tors), the return type has to be a non-nullable value type.
For the equality and relational operators, the return type has to be bool.
The & and | operators on bool? have separately defined behavior, which you’ll
see in section 4.3.4.
For all the operators, the operand types become their nullable equivalents. For the
unary and binary operators, the return type also becomes nullable, and a null value is
returned if any of the operands is a null value. The equality and relational operators
keep their non-nullable Boolean return types. For equality, two null values are consid-
ered equal, and a null value and any non-null value are considered different, which is
consistent with the behavior you saw in section 4.2.3. The relational operators always
return false if either operand is a null value. When none of the operands is a null
value, the operator of the non-nullable type is invoked in the obvious way.
All these rules sound more complicated than they really are—for the most part,
everything works as you probably expect it to. It’s easiest to see what happens with a
few examples, and as int has so many predefined operators (and integers can be so
easily expressed), it’s the natural demonstration type. Table 4.1 shows a number of
expressions, the lifted operator signature, and the result. It’s assumed that there are
variables four, five, and nullInt, each with type int? and with the obvious values.
Table 4.1
Examples of lifted operators applied to nullable integers
Expression
Lifted operator
Result
-nullInt
-five
five + nullInt
five + five
nullInt == nullInt
five == five
five == nullInt
five == four
four < five
nullInt < five
five < nullInt
nullInt < nullInt
nullInt <= nullInt
int? –(int? x)
int? –(int? x)
int? +(int? x, int? y)
int? +(int? x, int? y)
bool ==(int? x, int? y)
bool ==(int? x, int? y)
bool ==(int? x, int? y)
bool ==(int? x, int? y)
bool <(int? x, int? y)
bool <(int? x, int? y)
bool <(int? x, int? y)
bool <(int? x, int? y)
bool <=(int? x, int? y)
null
-5
null
true
true
false
false
true
false
false
false
false
Possibly the most surprising line of the table is the last one—that a null value isn’t
deemed less than or equal to another null value, even though they are deemed to be
equal to each other (as per the fifth row)! Very odd, but unlikely to cause problems in
real life, in my experience.
One aspect of lifted operators and nullable conversion that has caused some con-
fusion is unintended comparisons with null when using a non-nullable value type.
The code that follows is legal, but not useful:


<!-- PDF page 152 -->

C# 2’s syntactic sugar for nullable types
int i = 5;
if (i == null)
{
Console.WriteLine ("Never going to happen");
}
The C# compiler raises warnings on this code, but you may consider it surprising that
it’s allowed at all. What’s happening is that the compiler sees the int expression on
the left side of the ==, sees null on the right side, and knows that there’s an implicit
conversion to int? from each of them. Because a comparison between two int? val-
ues is perfectly valid, the code doesn’t generate an error—just the warning. As a fur-
ther complication, this isn’t allowed in the case where, instead of int, you’re dealing
with a generic type parameter that has been constrained to be a value type—the rules
on generics prohibit the comparison with null in that situation.
Either way, there’ll be an error or a warning, so as long as you look closely at warn-
ings, you shouldn’t end up with deficient code due to this quirk, and hopefully my
pointing it out to you now will save you from getting a headache trying to work out
exactly what’s going on.
Now you can answer the question at the end of the previous section—why we used
death.Value - birth in listing 4.4 instead of just death - birth. Applying the previ-
ous rules, you could have used the latter expression, but the result would’ve been a
TimeSpan? instead of a TimeSpan. This would’ve left you with the options of casting
the result to TimeSpan using its Value property, or changing the Age property to
return a TimeSpan?, which just pushes the issue onto the caller. It’s still a bit ugly, but
you’ll see a nicer implementation of the Age property in section 4.3.6.
In the list of restrictions regarding operator lifting, I mentioned that bool? works
slightly differently than the other types. The next section explains this and pulls the
lens back to see the bigger picture of why all these operators work the way they do.
4.3.4
Nullable logic
I vividly remember my early electronics lessons at school. They always seemed to
revolve around either working out the voltage across different parts of a circuit using
the V=IxR formula, or applying truth tables—the reference charts for explaining the
difference between NAND gates and NOR gates and so on. The idea is simple—a truth
table maps out every possible combination of inputs into whatever piece of logic
you’re interested in and tells you the output.
The truth tables we drew for simple, two-input logic gates always had four rows—
each input had two possible values, which means there were four possible combina-
tions. Boolean logic is simple like that, but what happens when you have a tristate log-
ical type? Well, bool? is just such a type—the value can be true, false, or null. That
means that your truth tables now need nine rows for binary operators as there are
nine combinations. The specification only highlights the logical AND and inclusive OR
operators (& and |, respectively) because the other operators—unary logical negation
(!) and exclusive OR (^)—follow the same rules as other lifted operators. There are


<!-- PDF page 153 -->

Saying nothing with nullable types
no conditional logical operators (the short-circuiting && and || operators) defined
for bool?, which makes life simpler.
For the sake of completeness, table 4.2 gives the truth table for all four valid bool?
logical operators.
Table 4.2
Truth table for the logical operators AND, inclusive OR, exclusive OR,
and logical negation, applied to the bool? type
x
y
x & y
x | y
x ^ y
!x
true
true
true
false
false
false
null
null
null
true
false
null
true
false
null
true
false
null
true
false
null
false
false
false
null
false
null
true
true
true
true
false
null
true
null
null
false
true
null
true
false
null
null
null
null
false
false
false
true
true
true
null
null
null
If you find reasoning about rules easier to understand than looking up values in
tables, the idea is that a null bool? value is in some senses a “maybe.” If you imagine
that each null entry in the input side of the table is a variable instead, you’ll always get
a null value on the output side of the table if the result depends on the value of that
variable. For instance, looking at the third line of the table, the expression true & y
will only be true if y is true, but the expression true | y will always be true whatever
the value of y is, so the nullable results are null and true, respectively.
When considering the lifted operators and particularly how nullable logic works,
the language designers had two slightly contradictory sets of existing behavior—C# 1
null references and SQL NULL values. In many cases, these don’t conflict at all—C# 1
had no concept of applying logical operators to null references, so there was no prob-
lem in using the SQL-like results given earlier. The definitions you’ve seen may sur-
prise some SQL developers, though, when it comes to comparisons. In standard SQL,
the result of comparing two values (in terms of equality or greater than/less than) is
always unknown if either value is NULL. The result in C# 2 is never null, and in particu-
lar two null values are considered to be equal to each other.
REMINDER: THIS IS C# SPECIFIC!
It’s worth remembering that the lifted opera-
tors and conversions, along with the bool? logic described in this section, are
all provided by the C# compiler and not by the CLR or the framework itself. If
you use ildasm on code that evaluates any of these nullable operators, you’ll
find that the compiler has created all the appropriate IL to test for null values
and dealt with them accordingly. This means that different languages can
behave differently on these matters—definitely something to look out for if
you need to port code between different .NET-based languages. For example,
VB treats lifted operators far more like SQL, so the result of x < y is Nothing if
x or y is Nothing.


<!-- PDF page 154 -->

C# 2’s syntactic sugar for nullable types
Another familiar operator is now available with nullable value types, and it behaves
exactly as you’d expect it to if you consider your existing knowledge of null references
and just tweak it to be in terms of null values.
4.3.5
Using the as operator with nullable types
Prior to C# 2, the as operator was only available for reference types. As of C# 2, it can
now be applied to nullable value types as well. The result is a value of that nullable
type—either the null value if the original reference was the wrong type or null, or a
meaningful value otherwise. Here’s a short example:
static void PrintValueAsInt32(object o)
{
int? nullable = o as int?;
Console.WriteLine(nullable.HasValue ?
nullable.Value.ToString() : "null");
}
...
PrintValueAsInt32(5);
PrintValueAsInt32("some string");
Yields 5
Yields null
This allows you to safely convert from an arbitrary reference to a value in a single
step—although you’d normally check. In C# 1, you’d have had to use the is operator
followed by a cast, which is inelegant: it’s essentially asking the CLR to perform the
same type check twice.
SURPRISING PERFORMANCE TRAP
I’d always assumed that doing one check
would be faster than two, but it appears that’s not the case—at least with the
versions of .NET I’ve tested with (up to and including .NET 4.5). When writing
a quick benchmark that summed all the integers within an array of type
object[], where only a third of the values were actually boxed integers, using
is and then a cast ended up being 20 times faster than using the as operator.
The details are beyond the scope of this book, and as always you should test
performance with your actual code and data before deciding on the best
course of action for your specific situation, but it’s worth being aware of.
You now know enough to use nullable types and predict how they’ll behave, but C# 2
has a sort of “bonus track” when it comes to syntax enhancements: the null coalescing
operator.
4.3.6
The null coalescing operator
Aside from the ? modifier, all of the rest of the C# compiler’s tricks relating to nul-
lable types so far have worked with the existing syntax. But C# 2 introduces a new
operator that can occasionally make code shorter and sweeter. It’s called the null
coalescing operator and appears in code as ?? between its two operands. It’s like the con-
ditional operator but specially tweaked for nulls.
It’s a binary operator that evaluates first ?? second by going through the follow-
ing steps (roughly speaking):


<!-- PDF page 155 -->

Saying nothing with nullable types
Evaluate first.
If the result is non-null, that’s the result of the whole expression.
Otherwise, evaluate second; the result then becomes the result of the whole
expression.
I say “roughly speaking” because the formal rules in the specification have to deal with
situations involving conversions between the types of first and second. As ever, these
aren’t important in most uses of the operator, and I don’t intend to go through
them—consult section 7.13 of the specification (“The Null Coalescing Operator”) if
you need the details.
Importantly, if the type of the second operand is the underlying type of the first
operand (and therefore non-nullable), the overall result is that underlying type. For
example, this code is perfectly valid:
int? a = 5;
int b = 10;
int c = a ?? b;
Note that you’re assigning directly to c even though its type is the non-nullable int
type. You can only do this because b is non-nullable, so you know that you’ll get a non-
nullable result eventually.
Obviously that’s a pretty simplistic example; let’s find a more practical use for this
operator by revisiting the Age property from listing 4.4. As a reminder, here’s how it
was implemented back then, along with the relevant variable declarations:
DateTime birth;
DateTime? death;
public TimeSpan Age
{
get
{
if (death == null)
{
return DateTime.Now - birth;
}
else
{
return death.Value - birth;
}
}
}
Note how both branches of the if statement subtract the value of birth from some
non-null DateTime value. The value you’re interested in is the latest time the person
was alive—the time of the person’s death if they have already died, or now otherwise.
To make progress in little steps, let’s try using the normal conditional operator first:
DateTime lastAlive = (death == null ? DateTime.Now : death.Value);
return lastAlive - birth;


<!-- PDF page 156 -->

C# 2’s syntactic sugar for nullable types
That’s progress of a sort, but arguably the conditional operator has made it harder to
read rather than easier, even though the new code is shorter. The conditional opera-
tor is often like that—how much you use it is a matter of personal preference,
although it’s worth consulting the rest of your team before using it extensively. Let’s
see how the null coalescing operator improves things. You want to use the value of
death if it’s non-null, and DateTime.Now otherwise. You can change the implementa-
tion to the following:
DateTime lastAlive = death ?? DateTime.Now;
return lastAlive - birth;
Note how the type of the result is DateTime rather than DateTime? because you’ve
used DateTime.Now as the second operand. You could shorten the whole thing to one
expression:
return (death ?? DateTime.Now) - birth;
But this is more obscure—in particular, in the two-line version the name of the last-
Alive variable helps the reader to see why you’re applying the null coalescing opera-
tor. I hope you agree that the two-line version is simpler and more readable than
either the original version using the if statement or the version using the normal con-
ditional operator from C# 1. Of course, it relies on the reader understanding what the
null coalescing operator does. In my experience, this is one of the least-known aspects
of C# 2, but it’s useful enough to make it worth trying to enlighten your co-workers
rather than avoiding it.
There are two further aspects that increase the operator’s usefulness. First, it
doesn’t just apply to nullable value types—it works with reference types too; you just
can’t use a non-nullable value type for the first operand, as that would be pointless.
Also, it’s right associative, which means an expression of the form first ?? second ??
third is evaluated as first ?? (second ?? third)—and so it continues for more oper-
ands. You can have any number of expressions, and they’ll be evaluated in order, stop-
ping with the first non-null result. If all of the expressions evaluate to null, the result
will be null too.
As a concrete example of this, suppose you have an online ordering system with
the concepts of a billing address, contact address, and shipping address. The business
rules declare that any user must have a billing address, but the contact address is
optional. The shipping address for a particular order is also optional, defaulting to
the billing address. These optional addresses are easily represented as null references
in the code. To determine who should be contacted in the case of a problem with a
shipment, the code in C# 1 might look something like this:
Address contact = user.ContactAddress;
if (contact == null)
{
contact = order.ShippingAddress;
if (contact == null)
{


<!-- PDF page 157 -->

Saying nothing with nullable types
contact = user.BillingAddress;
}
}
Using the conditional operator in this case is even more horrible. But using the null
coalescing operator makes the code very straightforward:
Address contact = user.ContactAddress ??
order.ShippingAddress ??
user.BillingAddress;
If the business rules changed to use the shipping address by default instead of the
user’s contact address, the change here would be extremely obvious. It wouldn’t be
particularly taxing with the if/else version, but I know I’d have to stop and think
twice, and verify the code mentally. I’d also be relying on unit tests, so there’d be little
chance of actually getting it wrong, but I’d prefer not to think about things like this
unless I absolutely have to.
EVERYTHING IN MODERATION
Just in case you’re thinking that my code is lit-
tered with uses of the null coalescing operator, it’s really not. I tend to con-
sider it when I see defaulting mechanisms involving nulls and possibly the
conditional operator, but it doesn’t come up often. When its use is natural,
though, it can be a powerful tool in the battle for readability.
You’ve seen how nullable types can be used for ordinary properties of objects—cases
where you naturally might not have a value for some particular aspect that’s still best
expressed with a value type. Those are the more obvious uses for nullable types and
indeed the most common ones. A few other patterns aren’t as obvious, but can still be
powerful when you’re used to them. We’ll explore two of these patterns in the next
section. This is more for the sake of interest than as part of learning about the behav-
ior of nullable types themselves—you now have all the tools you need to use them in
your own code. If you’re interested in quirky ideas and perhaps trying something new,
read on…
4.4
Novel uses of nullable types
Before nullable types became a reality, I saw lots of people effectively asking for them,
usually in relation to database access. That’s not the only use they can be put to,
though. The patterns presented in this section are unconventional but can make code
simpler. If you always stick to normal idioms of C#, that’s fine—this section might not
be for you, and I have a lot of sympathy for that point of view. I usually prefer simple
code over code that’s clever, but if a whole pattern provides benefits, that sometimes
makes the pattern worth learning. Whether you use these techniques is entirely up to
you—you may find that they suggest other ideas to use elsewhere in your code.
Without further ado, let’s start with an alternative to the TryXXX pattern men-
tioned in section 3.3.3.


<!-- PDF page 158 -->

Novel uses of nullable types
4.4.1
Trying an operation without using output parameters
The pattern of using a return value to say whether an operation worked and using an
output parameter to return the real result is becoming increasingly common in the
.NET Framework. I have no issues with the aims—the idea that some methods are likely
to fail to perform their primary purpose in non-exceptional circumstances is common
sense. My one problem with it is that I’m not a huge fan of output parameters. There’s
something slightly clumsy about the syntax of declaring a variable on one line, and
then immediately using it as an output parameter.
Methods returning reference types have often used a pattern of returning null on
failure and non-null on success, but that doesn’t work so well when null is a valid
return value in the success case. Hashtable is an example of both of these statements,
in a slightly ambivalent way: null is a theoretically valid value in a Hashtable, but in
my experience most uses of Hashtable never use null values, which makes it perfectly
acceptable to have code that assumes that a null value means a missing key.
One common scenario is to have each value of the Hashtable as a list: the first
time an item is added for a particular key, a new list is created and the item is added to
it. Thereafter, adding another item for the same key involves adding the item to the
existing list. Here’s the code in C# 1:
ArrayList list = hash[key];
if (list == null)
{
list = new ArrayList();
hash[key] = list;
}
list.Add(newItem);
Hopefully you’d use variable names more specific to your situation, but I’m sure you
get the idea and you may well have used the pattern yourself.4 With nullable types, this
pattern can be extended to value types, and it’s safer with value types, because if the
natural result type is a value type, then a null value could only be returned as a result
of failure. Nullable types add that extra Boolean piece of information in a nice gen-
eral way with language support, so why not use them?
To demonstrate this pattern in practice and in a context other than dictionary
lookups, I’ll use the classic example of the TryXXX pattern—parsing an integer. The
implementation of the TryParse method in the following listing shows the version of
the pattern using an output parameter, but then you see the version using nullable
types in the main part at the bottom.
4 Wouldn’t it be great if Hashtable and Dictionary<TKey,TValue> could take a delegate to call whenever
a new value was required due to looking up a missing key? Situations like this would be a lot simpler.


<!-- PDF page 159 -->

Saying nothing with nullable types
Listing 4.5
An alternative implementation of the TryXXX pattern
static int? TryParse(string text)
{
int ret;
if (int.TryParse(text, out ret))
{
return ret;
}
else
{
return null;
}
}
...
int? parsed = TryParse("Not valid");
if (parsed != null)
{
Console.WriteLine ("Parsed to {0}", parsed.Value);
}
else
{
Console.WriteLine ("Couldn't parse");
}
Classic call with
output parameter
Nullable call
You may think there’s little to distinguish the two versions here—they’re the same
number of lines, after all. But I believe there’s a difference in emphasis. The nullable
version encapsulates the natural return value and the success or failure into a single
variable. It also separates the doing from the testing, which puts the emphasis in the
right place, in my opinion. Usually, if I call a method in the condition part of an if
statement, that method’s primary purpose is to return a Boolean value. Here, the
return value is in some ways less important than the output parameter. When you’re
reading code, it’s easy to miss an output parameter in a method call and be left won-
dering what’s actually doing all the work and magically giving the answer. With the
nullable version, this is more explicit—the result of the method has all the informa-
tion you’re interested in. I’ve used this technique in a number of places (often with
more method parameters, at which point output parameters become even harder to
spot), and I believe it has improved the general feel of the code. Of course, this only
works for value types.
Another advantage of this pattern is that it can be used in conjunction with the
null coalescing operator—you can try to understand several pieces of input, stopping
at the first valid one. The normal TryXXX pattern allows this using the short-circuiting
operators, but the meaning isn’t nearly as clear when you use the same variable for
two different output parameters in the same statement.
ALTERNATIVELY, USE A TUPLE…
Another alternative to using a nullable result
is to use a return type with two very clearly separate members, one of which is
responsible for indicating success or failure and another of which is responsi-
ble for indicating the value on success. Nullable<T> is convenient because it


<!-- PDF page 160 -->

Novel uses of nullable types
gives you a Boolean property and another of type T, but the meaning of the
return value could perhaps be more explicit. .NET 4 includes the Tuple family
of types: arguably a Tuple<int, bool> might be cleaner than int? here. Even
cleaner would be a custom type to represent the result of a parse operation:
ParseResult<T>, for example. In this case, you could hand the value around
to other code without any fear that its meaning will be confused, and you can
add extra information such as the cause of any parsing failure.
The next pattern is an answer to a specific pain point—the irritation and fluff that can
be present when writing multitiered comparisons.
4.4.2
Painless comparisons with the null coalescing operator
I suspect you dislike writing the same code over and over again as much as I do. Refac-
toring can often get rid of duplication, but some cases resist refactoring surprisingly
effectively. Code for Equals and Compare often falls firmly into this category.
Suppose you’re writing an e-commerce site and have a list of products. You might
want to sort them by popularity (descending), then price, then name—so that the
five-star-rated products come first, but the cheapest five-star products come before the
more expensive ones. If there are multiple products with the same price, products
beginning with A are listed before products beginning with B. This isn’t a problem
specific to e-commerce sites—sorting data by multiple criteria is a fairly common
requirement in computing.
Assuming you have a suitable Product type, you could write the comparison with
code like this in C# 1:
public int Compare(Product first, Product second)
{
// Reverse comparison of popularity to sort descending
int ret = second.Popularity.CompareTo(first.Popularity);
if (ret != 0)
{
return ret;
}
ret = first.Price.CompareTo(second.Price);
if (ret != 0)
{
return ret;
}
return first.Name.CompareTo(second.Name);
}
This assumes that you won’t be asked to compare null references and that all of the
properties will return non-null references too. You could use some up-front null com-
parisons and Comparer<T>.Default to handle those cases, but that would make the
code even longer and more involved. The code could be shorter (and avoid returning
from the middle of the method) if you rearranged it slightly, but the fundamental
“compare, check, compare, check” pattern would still be present, and it wouldn’t be
as obvious that once you have a nonzero answer you’re done.


<!-- PDF page 161 -->

Saying nothing with nullable types
Ah…that last sentence is reminiscent of something else: the null coalescing opera-
tor. As you saw in section 4.3, if you have a lot of expressions separated by ??, then the
operator will be repeatedly applied until it hits a non-null expression. Now all you
have to do is work out a way of returning null instead of zero from a comparison. This
is easy to do in a separate method that can also encapsulate the use of the default com-
parer. You can even have an overload to use a specific comparer if you want. You can
also deal with the case where either of the Product references you’re passed is null.
First, let’s look at the class implementing the helper methods, as shown in the fol-
lowing listing.
Listing 4.6
Helper class for providing partial comparisons
public static class PartialComparer
{
public static int? Compare<T>(T first, T second)
{
return Compare(Comparer<T>.Default, first, second);
}
public static int? Compare<T>(IComparer<T> comparer,
T first, T second)
{
int ret = comparer.Compare(first, second);
return ret == 0 ? new int?() : ret;
}
public static int? ReferenceCompare<T>(T first, T second)
where T : class
{
return first == second ? 0
: first == null ? -1
: second == null ? 1
: new int?();
}
}
The Compare methods in listing 4.6 are almost pathetically simple—when a comparer
isn’t specified, the default comparer for the type is used, and all that happens to the
comparison’s return value is that zero is translated to the null value.
NULL VALUES AND THE CONDITIONAL OPERATOR
You may have been surprised to
see me use new int?() rather than null to return the null value in the sec-
ond Compare method. The conditional operator requires that its second and
third operands either be of the same type, or that there be an implicit conver-
sion from one to the other, and that wouldn’t be the case with null, because
the compiler wouldn’t know what type the value was meant to be. The lan-
guage rules don’t take the overall aim of the statement (returning from a
method with a return type of int?) into account when examining subexpres-
sions. Other options include casting either operand to int? explicitly or
using default(int?) for the null value. Basically, the important thing is to
make sure that one of the operands is known to be an int? value.


<!-- PDF page 162 -->

Summary
The ReferenceCompare method uses another conditional operator—three of them, in
fact. You may find this less readable than the (rather longer) equivalent code using
if/else blocks—it depends on how comfortable you are with the conditional opera-
tor. I like it because it makes the order of the comparisons clear. Also, this could easily
have been a nongeneric method with two object parameters, but this form prevents
you from accidentally using the method to compare value types via boxing. The
method really is only useful with reference types, which is indicated by the type param-
eter constraint.
Even though this class is simple, it’s remarkably useful. You can now replace the
previous product comparison with a neater implementation:
public int Compare(Product first, Product second)
{
return PC.ReferenceCompare(first, second) ??
// Reverse comparison of popularity to sort descending
PC.Compare(second.Popularity, first.Popularity) ??
PC.Compare(first.Price, second.Price) ??
PC.Compare(first.Name, second.Name) ??
0;
}
As you may have noticed, I’ve used PC rather than PartialComparer—this is solely for
the sake of being able to fit the lines on the printed page. In real code, I’d use the full
type name and still have one comparison per line. Of course, if you wanted short lines
for some reason, you could specify a using directive to make PC an alias for Partial-
Comparer—I just wouldn’t recommend it.
The final 0 indicates that if all of the earlier comparisons have passed, the two
Product instances are equal. You could just use Comparer<string>.Default.Compare
(first.Name, second.Name) as the final comparison, but that would hurt the symme-
try of the method.
This comparison plays nicely with nulls, it’s easy to modify, it forms an easy pattern
to use for other comparisons, and it only compares as far as it needs to—if the prices
are different, the names won’t be compared.
You may be wondering whether the same technique could be applied to equality
tests, which often have similar patterns. There’s much less point in the case of equal-
ity, because after the nullity and reference equality tests, you can just use && to provide
the desired short-circuiting functionality for Booleans. A method returning a bool?
can be used to obtain an initial definitely equal, definitely not equal, or unknown result
based on the references, though. The complete code of PartialComparer on this
book’s website contains the appropriate utility method and examples of its use.
4.5
Summary
When faced with a problem, developers tend to take the easiest short-term solution,
even if it’s not particularly elegant. That’s often the right decision—you don’t want to
be guilty of overengineering, after all. But it’s always nice when a good solution is also
the easiest solution.


<!-- PDF page 163 -->

Saying nothing with nullable types
Nullable types solve a specific problem that only had somewhat ugly solutions
before C# 2. The features provided are a better-supported version of a solution that
was feasible but time consuming in C# 1. The combination of generics (to avoid code
duplication), CLR support (to provide suitable boxing and unboxing behavior), and
language support (to provide concise syntax along with convenient conversions and
operators) makes the solution far more compelling than it was previously.
It just so happens that in providing nullable types, the C# and framework designers
have made some other patterns available that weren’t worth the effort before. We’ve
looked at some of them in this chapter, and I wouldn’t be surprised to see more of
them appearing over time.
So far generics and nullable types have addressed areas where in C# 1 you occa-
sionally had to hold your nose due to unpleasant code smells. This pattern continues
in the next chapter, where we’ll discuss the enhancements to delegates. These form
an important part of the subtle change of direction of both the C# language and the
.NET Framework toward a slightly more functional viewpoint. This emphasis is made
even clearer in C# 3, so although we’re not looking at those features quite yet, the del-
egate enhancements in C# 2 act as a bridge between the familiarity of C# 1 and the
style of idiomatic C# 3, which can often be radically different from earlier versions.
