using DeepLens.Domain.Entities;
using NUnit.Framework;
using FluentAssertions;

namespace DeepLens.Domain.Tests;

[TestFixture]
public class CustomerDomainTests
{
    [Test]
    public void Customer_FullName_CombinesFirstNameAndLastName()
    {
        var customer = new Customer
        {
            FirstName = "Priya",
            LastName = "Sharma"
        };

        customer.FullName.Should().Be("Priya Sharma");
    }

    [Test]
    public void Customer_FullName_HandlesFirstNameOnly()
    {
        var customer = new Customer
        {
            FirstName = "Priya",
            LastName = null
        };

        customer.FullName.Should().Be("Priya");
    }

    [Test]
    public void Customer_FullName_HandlesEmptyStrings()
    {
        var customer = new Customer
        {
            FirstName = "",
            LastName = ""
        };

        customer.FullName.Should().BeEmpty();
    }

    [Test]
    public void CustomerAddress_Defaults_ShouldHaveIsDefaultFalse()
    {
        var address = new CustomerAddress
        {
            Name = "Priya",
            Phone = "+919876543210",
            Line1 = "123 Park Street",
            Pincode = "500001"
        };

        address.IsDefault.Should().BeFalse();
        address.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }
}
